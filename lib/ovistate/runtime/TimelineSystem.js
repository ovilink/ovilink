/**
 * Timeline System
 * Handles animation playback, keyframe interpolation, and time management.
 * Decoupled from the main Core.js to maintain modularity.
 */

export default class TimelineSystem {
    constructor(runtime) {
        this.runtime = runtime;
        this.isPlaying = false;
        this.isRecording = false; // NEW: Puppeteering mode
        this.currentTime = 0; // In frames
        this.fps = 30; // Frames per second
        this.totalFrames = 300; // Default duration
        this.loop = true;
        this.recordingSampleRate = 2; // Capture every 2 frames for performance
        this._frameCounter = 0;

        // NEW: Multi-Clip Support
        this.activeClips = new Map(); // targetId -> activeClipName (defaults to 'default')
        this.clipMetaData = new Map(); // targetId -> { loop: true, onFinish: null }
    }

    getClip(obj, name = 'default') {
        if (!obj.animations) obj.animations = {};
        if (!obj.animations[name]) obj.animations[name] = { keys: {} };
        return obj.animations[name];
    }

    activeClipName(obj) {
        return this.activeClips.get(obj.id) || 'default';
    }

    playClip(obj, name, loop = true, onFinish = null) {
        if (!obj.animations || !obj.animations[name]) {
            console.warn(`[TimelineSystem] Clip "${name}" not found for object ${obj.id}`);
            return;
        }
        this.activeClips.set(obj.id, name);
        this.clipMetaData.set(obj.id, { loop, onFinish, startTime: performance.now() });

        this.currentTime = 0; // Reset clip to start
        this.isPlaying = true;
        this.loop = loop;
        console.log(`🎬 Playing clip "${name}" for ${obj.id} (Loop: ${loop})`);
    }

    stopClip(obj) {
        this.activeClips.delete(obj.id);
        this.clipMetaData.delete(obj.id);
    }

    play() {
        this.isPlaying = true;
    }

    pause() {
        this.isPlaying = false;
        this.isRecording = false; // stop recording if paused
    }

    stop() {
        this.isPlaying = false;
        this.isRecording = false;
        this.currentTime = 0;

        // Clear offsets for stable additive mode before resetting
        this.runtime.objects.forEach(obj => {
            if (obj._aniOff_x) { obj.x -= obj._aniOff_x; obj._aniOff_x = 0; }
            if (obj._aniOff_y) { obj.y -= obj._aniOff_y; obj._aniOff_y = 0; }
        });

        this.applyKeyframes(); // Reset to frame 0
    }

    /**
     * Main update loop called by Core.js
     * @param {number} dt Delta time in seconds
     */
    update(dt) {
        if (!this.isPlaying) return;

        // Convert dt (seconds) to frames
        // dt * fps = frames elapsed
        const frameDelta = dt * this.fps;
        this.previousTime = this.currentTime;
        this.currentTime += frameDelta;

        if (this.currentTime >= this.totalFrames) {
            if (this.loop) {
                this.currentTime = 0;
            } else {
                this.currentTime = this.totalFrames;
                this.pause();

                // Trigger On-Finish for all active clips that aren't looping
                this.clipMetaData.forEach((meta, objId) => {
                    if (!meta.loop && meta.onFinish) {
                        meta.onFinish();
                        meta.onFinish = null;
                    }
                });
            }
        }

        // --- NEW: Live Recording (Puppeteering) ---
        if (this.isRecording) {
            this._frameCounter++;
            if (this._frameCounter >= this.recordingSampleRate) {
                this._frameCounter = 0;
                this.captureLiveMovement();
            }
        }

        this.applyKeyframes();
    }

    captureLiveMovement() {
        // Only record if something is being dragged
        const obj = this.runtime._draggingObj;
        if (obj) {
            // Record current X and Y
            this.addKeyframe(obj, 'x', obj.x, this.currentTime, 'linear');
            this.addKeyframe(obj, 'y', obj.y, this.currentTime, 'linear');

            // Log for feedback (optional, maybe too spammy)
            // console.log(`🔴 Recording: ${obj.id} at frame ${Math.round(this.currentTime)}`);
        }
    }

    /**
     * Applies values from keyframes to all objects
     */
    applyKeyframes() {
        // Iterate over all objects
        this.runtime.objects.forEach(obj => {
            const clipName = this.activeClipName(obj);

            // Legacy/Fallback check: if obj.timeline exists but not animations, we use it as 'default'
            let timeline = null;
            if (obj.animations && obj.animations[clipName]) {
                timeline = obj.animations[clipName];
            } else if (obj.timeline && clipName === 'default') {
                timeline = obj.timeline;
            }

            if (!timeline) return;

            // 1. Property Animation
            if (timeline.keys) {
                const isRelative = timeline.isRelative === true;
                for (const prop in timeline.keys) {
                    const keyframes = timeline.keys[prop];
                    const value = this.interpolate(keyframes, this.currentTime);

                    if (value !== null) {
                        if (isRelative && (prop === 'x' || prop === 'y')) {
                            // Stable Additive: Remove previous frame's contribution before adding new
                            const lastOff = obj[`_aniOff_${prop}`] || 0;
                            obj[prop] -= lastOff;

                            obj[prop] += value;
                            obj[`_aniOff_${prop}`] = value; // Store for next frame
                        } else {
                            // Absolute: Clear any stale offset data
                            obj[`_aniOff_${prop}`] = 0;
                            obj[prop] = value;
                        }
                    }
                }
            }

            // 2. Motion Path Animation (Overrides X/Y if active)
            const pathId = obj.pathId || (timeline.pathId !== undefined ? timeline.pathId : null);
            if (pathId) {
                const pathObj = this.runtime.getObject(pathId);
                if (pathObj && (pathObj.type === 'path' || pathObj.type === 'vector_path') && pathObj.points) {
                    const keyframes = (timeline.keys && timeline.keys['pathProgress']) ? timeline.keys['pathProgress'] : null;
                    let progress = (obj.pathProgress !== undefined) ? obj.pathProgress : 0;

                    if (keyframes) {
                        progress = this.interpolate(keyframes, this.currentTime);
                    }

                    if (progress !== null) {
                        const tension = pathObj.tension !== undefined ? pathObj.tension : 0.5;
                        const pos = this.runtime.getSplinePoint(pathObj.points, tension, progress, pathObj.closed);

                        // Apply path position with world offset
                        obj.x = pos.x + (pathObj.x || 0);
                        obj.y = pos.y + (pathObj.y || 0);

                        // Orientation
                        const orient = (obj.orientToPath !== undefined) ? obj.orientToPath : timeline.orientToPath;
                        if (orient && progress < 1) {
                            const nextT = Math.min(1, progress + 0.001);
                            const nextPos = this.runtime.getSplinePoint(pathObj.points, tension, nextT, pathObj.closed);
                            const angle = Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x) * 180 / Math.PI;
                            obj.rotation = angle;
                        }
                    }
                }
            }

            // 3. Event Triggers (Actions)
            // We check if we just crossed an event keyframe
            // Requires tracking 'lastTime' to avoid re-triggering or missing skipped frames
            if (timeline.actions) {
                this.checkActions(obj, timeline, this.previousTime, this.currentTime);
            }
        });

        this.previousTime = this.currentTime;
    }

    checkActions(obj, timeline, startT, endT) {
        if (!timeline.actions) return;

        timeline.actions.forEach(actionKey => {
            // Check if frame 't' is within [startT, endT]
            // We use > startT and <= endT to trigger exactly once
            if (actionKey.t > startT && actionKey.t <= endT) {
                console.log(`🎬 Timeline Trigger: ${actionKey.action} on ${obj.id} at frame ${actionKey.t}`);

                // Execute Action via Runtime
                // This triggers 'manual' behaviors listening for this action ID
                this.runtime.emitAction(actionKey.action);
            }
        });
    }

    /**
     * Linearly Interpolate value for the current time
     * @param {Array} keyframes Sorted array of keyframes [{t: 0, v: 10}, {t: 30, v: 100}]
     * @param {number} time Current time in frames
     */
    interpolate(keyframes, time) {
        if (!keyframes || keyframes.length === 0) return null;

        // 1. Before first keyframe
        if (time <= keyframes[0].t) {
            return keyframes[0].v;
        }

        // 2. After last keyframe
        if (time >= keyframes[keyframes.length - 1].t) {
            return keyframes[keyframes.length - 1].v;
        }

        // 3. Between keyframes
        for (let i = 0; i < keyframes.length - 1; i++) {
            const k1 = keyframes[i];
            const k2 = keyframes[i + 1];

            if (time >= k1.t && time < k2.t) {
                const t = (time - k1.t) / (k2.t - k1.t); // Normalized time (0 to 1)

                // Easing Logic
                const easing = k1.e || 'linear'; // Default to linear
                const easedT = this.applyEasing(t, easing);

                return this.lerp(k1.v, k2.v, easedT);
            }
        }

        return null;
    }

    applyEasing(t, type) {
        switch (type) {
            case 'easeIn': return t * t; // Quad Ease In
            case 'easeOut': return t * (2 - t); // Quad Ease Out
            case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Quad Ease In Out
            case 'linear':
            default: return t;
        }
    }

    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    /**
     * Add or update a keyframe for an object
     * @param {string} easing 'linear', 'easeIn', 'easeOut', 'easeInOut'
     */
    addKeyframe(obj, property, value, time = this.currentTime, easing = 'linear') {
        const clipName = this.activeClipName(obj);
        const clip = this.getClip(obj, clipName);

        if (!clip.keys) clip.keys = {};
        if (!clip.keys[property]) clip.keys[property] = [];

        const keys = clip.keys[property];

        // Remove existing key at same time
        const existingIndex = keys.findIndex(k => Math.abs(k.t - time) < 0.01);
        if (existingIndex > -1) {
            keys[existingIndex].v = value;
            // Update easing if provided (optional behavior, maybe keep existing if not specified?)
            // For now, let's update it.
            if (easing) keys[existingIndex].e = easing;
        } else {
            keys.push({ t: time, v: value, e: easing });
        }

        // Keep sorted
        keys.sort((a, b) => a.t - b.t);
    }

    /**
     * Add Action Keyframe (Event Trigger)
     */
    addActionKeyframe(obj, actionId, time = this.currentTime) {
        if (!obj.timeline) obj.timeline = {};
        if (!obj.timeline.actions) obj.timeline.actions = [];

        // Avoid duplicates at exact same time?
        const existing = obj.timeline.actions.find(k => Math.abs(k.t - time) < 0.01 && k.action === actionId);
        if (!existing) {
            obj.timeline.actions.push({ t: time, action: actionId });
            obj.timeline.actions.sort((a, b) => a.t - b.t);
            console.log(`🎬 Added Action Keyframe: '${actionId}' at frame ${time}`);
        }
    }
}
