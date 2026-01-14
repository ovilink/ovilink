
// Standard Behaviors Library & Registry
export class BehaviorRegistry {
    constructor(runtime) {
        this.runtime = runtime;
        this.runtime.registry = this; // Attach self

        // Auto-register built-in behaviors
        this.initStandardBehaviors();
    }

    register(id, def) {
        // Register update function directly to runtime
        if (def.update) {
            this.runtime.registerBehavior(id, (obj, dt, rt, reg) => {
                // --- ACTIVATION LOGIC ---
                // (Using 'this' here refers to runtime context usually, but we pass 'reg' (this registry) explicitly)

                // Ensure registry is available
                if (!reg) reg = this; // Fallback

                const actMode = reg.getParameter(obj, id, 'activationMode') || 'on_enter';

                if (!obj._behaviorState) obj._behaviorState = {};
                if (obj._behaviorState[id] === undefined) {
                    obj._behaviorState[id] = (actMode === 'on_enter');
                }

                let shouldRun = false;
                if (actMode === 'on_enter') shouldRun = true;
                else if (actMode === 'on_hover') {
                    if (obj.isHovered) obj._behaviorState[id] = true;
                    shouldRun = obj._behaviorState[id];
                } else if (actMode === 'on_click') {
                    if (obj._justClicked) obj._behaviorState[id] = true;
                    shouldRun = obj._behaviorState[id];
                } else if (actMode === 'on_click_toggle') {
                    if (obj._justClicked) obj._behaviorState[id] = !obj._behaviorState[id];
                    shouldRun = obj._behaviorState[id];
                } else if (actMode === 'manual') {
                    const actId = reg.getParameter(obj, id, 'activationId');
                    // Generic Event Trigger
                    if (actId && rt.lastAction === actId) {
                        obj._behaviorState[id] = true;

                        // Generic Duration Support (for any behavior WITHOUT native duration)
                        // If behavior handles its own duration (like Interactive Shake), we let it run indefinitely (it will idle itself)
                        const hasNativeDuration = def.parameters && def.parameters.duration;
                        if (!hasNativeDuration) {
                            const duration = reg.getParameter(obj, id, 'duration');
                            if (duration) {
                                obj._behaviorState[id + '_timer'] = duration;
                            }
                        }
                    }

                    shouldRun = obj._behaviorState[id];

                    // Handle Duration Countdown
                    if (shouldRun && obj._behaviorState[id + '_timer'] !== undefined) {
                        obj._behaviorState[id + '_timer'] -= dt;
                        if (obj._behaviorState[id + '_timer'] <= 0) {
                            obj._behaviorState[id] = false;
                            delete obj._behaviorState[id + '_timer'];
                        }
                    }
                }

                if (shouldRun) {
                    def.update(obj, dt, rt, reg);
                } else {
                    // Typewriter Reset Logic
                    if (id === 'typewriter' && actMode === 'manual' && obj.type === 'text') {
                        if (!obj._lastFullText && obj.text && obj.text.trim()) {
                            obj._lastFullText = obj.text;
                        }
                        obj.text = '';
                    }
                }
            });
        }
    }

    getParameter(obj, behaviorId, paramName) {
        // 1. Check runtime object internal params first (with underscore)
        if (obj._behaviorParams && obj._behaviorParams[behaviorId] &&
            obj._behaviorParams[behaviorId][paramName] !== undefined) {
            return obj._behaviorParams[behaviorId][paramName];
        }
        // 2. Fallback to legacy structure
        if (obj.behaviorParams && obj.behaviorParams[behaviorId] &&
            obj.behaviorParams[behaviorId][paramName] !== undefined) {
            return obj.behaviorParams[behaviorId][paramName];
        }
        // 3. Fallback
        return undefined;
    }

    initStandardBehaviors() {
        registerPhysics(this);
        registerMotion(this);
        registerTransform(this);
        registerInteractive(this);
        registerText(this);
        registerLogic(this);
        registerTrigger(this);
        registerRuntimePathBehaviors(this);
    }
}

// --- Behavior Registration Functions ---
// (These need to be available to the class method above)

function registerPhysics(registry) {
    registry.register('solid_body', {
        init(obj, rt, reg) {
            obj.isSolid = true;
            obj.solidBounciness = reg.getParameter(obj, 'solid_body', 'bounciness');
            obj.solidFriction = reg.getParameter(obj, 'solid_body', 'friction');
            obj.killParticles = reg.getParameter(obj, 'solid_body', 'killParticles');
        },
        update(obj, dt, rt, reg) {
            obj.isSolid = true;
            obj.solidBounciness = reg.getParameter(obj, 'solid_body', 'bounciness');
            obj.solidFriction = reg.getParameter(obj, 'solid_body', 'friction');
            obj.killParticles = reg.getParameter(obj, 'solid_body', 'killParticles');
        }
    });
    registry.register('impulse', {
        update(obj, dt, runtime, registry) {
            const actionID = registry.getParameter(obj, 'impulse', 'actionID') || 'push';
            if (runtime.lastAction === actionID) {
                if (!obj.physics) obj.physics = { enabled: true, velocity: { x: 0, y: 0 } };
                obj.physics.enabled = true;
                const direction = registry.getParameter(obj, 'impulse', 'direction') || 'custom';
                const strength = registry.getParameter(obj, 'impulse', 'strength') !== undefined ? registry.getParameter(obj, 'impulse', 'strength') : 500;
                let fx = 0, fy = 0;
                if (direction === 'custom') {
                    fx = registry.getParameter(obj, 'impulse', 'forceX') !== undefined ? registry.getParameter(obj, 'impulse', 'forceX') : 500;
                    fy = registry.getParameter(obj, 'impulse', 'forceY') !== undefined ? registry.getParameter(obj, 'impulse', 'forceY') : 0;
                } else if (direction === 'right') { fx = strength; }
                else if (direction === 'left') { fx = -strength; }
                else if (direction === 'up') { fy = -strength; }
                else if (direction === 'down') { fy = strength; }
                const torque = registry.getParameter(obj, 'impulse', 'torque') !== undefined ? registry.getParameter(obj, 'impulse', 'torque') : 0;
                if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
                obj.physics.velocity.x += fx;
                obj.physics.velocity.y += fy;
                if (obj.physics.angularVelocity === undefined) obj.physics.angularVelocity = 0;
                obj.physics.angularVelocity += torque * 0.1;
            }
        }
    });
}

function registerMotion(registry) {
    registry.register('wiggle', {
        update(obj, dt, runtime, reg) {
            const intensity = reg.getParameter(obj, 'wiggle', 'intensity') || 2;
            const speed = reg.getParameter(obj, 'wiggle', 'speed') || 1;
            obj.x += (Math.random() - 0.5) * intensity * speed;
            obj.y += (Math.random() - 0.5) * intensity * speed;
        }
    });
    registry.register('shake_continuous', {
        name: 'Shake (Continuous)',
        description: 'Continuous Earthquake shaking effect',
        init(obj) { if (!obj._sT) obj._sT = 0; if (!obj._sOX) obj._sOX = obj.x; if (!obj._sOY) obj._sOY = obj.y; },
        update(obj, dt, rt, reg) {
            if (!obj._sT) this.init(obj);
            const amp = reg.getParameter(obj, 'shake', 'amplitude') || 5;
            const freq = reg.getParameter(obj, 'shake', 'frequency') || 5;
            obj._sT += dt * freq;
            obj.x = obj._sOX + Math.sin(obj._sT * 10) * amp;
            obj.y = obj._sOY + Math.cos(obj._sT * 7) * amp;
        }
    });
    registry.register('float', {
        init(obj) { if (!obj._fY) obj._fY = obj.y; if (!obj._fT) obj._fT = 0; },
        update(obj, dt, rt, reg) {
            if (!obj._fY) this.init(obj);
            const h = reg.getParameter(obj, 'float', 'height') || 30;
            const s = reg.getParameter(obj, 'float', 'speed') || 1;
            obj._fT += dt * s;
            obj.y = obj._fY + Math.sin(obj._fT) * h;
        }
    });
    registry.register('spiral', {
        init(obj) { if (!obj._spA) obj._spA = 0; if (!obj._spR) obj._spR = 50; },
        update(obj, dt, rt, reg) {
            if (!obj._spA) this.init(obj);
            const speed = reg.getParameter(obj, 'spiral', 'speed') || 1;
            const expansion = reg.getParameter(obj, 'spiral', 'expansion') || 0.5;
            const centerX = reg.getParameter(obj, 'spiral', 'centerX') || 400;
            const centerY = reg.getParameter(obj, 'spiral', 'centerY') || 300;
            obj._spA += dt * speed;
            obj._spR += expansion * dt * 10;
            obj.x = centerX + Math.cos(obj._spA) * obj._spR;
            obj.y = centerY + Math.sin(obj._spA) * obj._spR;
        }
    });
    registry.register('zigzag', {
        init(obj) { if (!obj._zzT) obj._zzT = 0; if (!obj._zzO) obj._zzO = { x: obj.x, y: obj.y }; },
        update(obj, dt, rt, reg) {
            if (!obj._zzT) this.init(obj);
            const amp = reg.getParameter(obj, 'zigzag', 'amplitude') || 40;
            const freq = reg.getParameter(obj, 'zigzag', 'frequency') || 3;
            const dir = reg.getParameter(obj, 'zigzag', 'direction') || 'horizontal';
            obj._zzT += dt * freq;
            const offset = Math.sin(obj._zzT * Math.PI) * amp;
            if (dir === 'horizontal') { obj.y = obj._zzO.y + offset; obj.x += dt * 50; } else { obj.x = obj._zzO.x + offset; obj.y += dt * 50; }
        }
    });
    registry.register('wave_motion', {
        init(obj) { if (!obj._wY) obj._wY = obj.y; if (!obj._wT) obj._wT = 0; },
        update(obj, dt, rt, reg) {
            if (!obj._wY) this.init(obj);
            const amp = reg.getParameter(obj, 'wave_motion', 'amplitude') || 50;
            const wave = reg.getParameter(obj, 'wave_motion', 'wavelength') || 100;
            const spd = reg.getParameter(obj, 'wave_motion', 'speed') || 1;
            obj._wT += dt * spd;
            obj.x += dt * 30;
            obj.y = obj._wY + Math.sin((obj.x / wave) * Math.PI * 2) * amp;
        }
    });
    registry.register('bounce', {
        update(obj, dt, rt, reg) {
            if (!obj.physics) obj.physics = { enabled: true, velocity: { x: 0, y: 0 } };
            obj.physics.enabled = true;
            const bounciness = reg.getParameter(obj, 'bounce', 'bounciness');
            if (bounciness !== undefined) obj.physics.bounciness = bounciness;
        }
    });
    registry.register('orbit', {
        init(obj) { if (!obj._oA) obj._oA = 0; },
        update(obj, dt, rt, reg) {
            if (!obj._oA && obj._oA !== 0) this.init(obj);
            const speed = reg.getParameter(obj, 'orbit', 'speed') || 1;
            const rx = reg.getParameter(obj, 'orbit', 'radiusX') || 150;
            const ry = reg.getParameter(obj, 'orbit', 'radiusY') || 150;
            const orient = reg.getParameter(obj, 'orbit', 'orientType') || 'none';

            // Dynamic Center Logic
            const type = reg.getParameter(obj, 'orbit', 'centerType') || 'point';
            let cx = 400, cy = 300;

            if (type === 'mouse') {
                cx = rt.mouseX || 0;
                cy = rt.mouseY || 0;
            } else if (type === 'object') {
                const tId = reg.getParameter(obj, 'orbit', 'targetId');
                const tObj = rt.getObject(tId);
                if (tObj) {
                    cx = tObj.x;
                    cy = tObj.y;
                } else {
                    cx = rt.width ? rt.width / 2 : 400;
                    cy = rt.height ? rt.height / 2 : 300;
                }
            } else {
                cx = reg.getParameter(obj, 'orbit', 'centerX') !== undefined ? Number(reg.getParameter(obj, 'orbit', 'centerX')) : 400;
                cy = reg.getParameter(obj, 'orbit', 'centerY') !== undefined ? Number(reg.getParameter(obj, 'orbit', 'centerY')) : 300;
            }

            obj._oA += dt * speed;

            // Apply Elliptical Position
            obj.x = cx + Math.cos(obj._oA) * rx;
            obj.y = cy + Math.sin(obj._oA) * ry;

            // Orientation Logic
            if (orient === 'face_center') {
                const angleToCenter = Math.atan2(cy - obj.y, cx - obj.x);
                obj.rotation = angleToCenter * 180 / Math.PI;
            } else if (orient === 'face_forward') {
                const dx = -rx * Math.sin(obj._oA);
                const dy = ry * Math.cos(obj._oA);
                let angleObj = Math.atan2(dy, dx);
                if (speed < 0) angleObj += Math.PI;
                obj.rotation = angleObj * 180 / Math.PI;
            } else if (orient === 'self_rotate') {
                const rSpeed = reg.getParameter(obj, 'orbit', 'rotateSpeed') || 90;
                const rDir = reg.getParameter(obj, 'orbit', 'rotateDirection') || 'clockwise';
                let delta = rSpeed * dt;
                if (rDir === 'counter_clockwise') delta *= -1;
                obj.rotation += delta;
            }
        }
    });
    registry.register('scroller', {
        init(obj) { if (!obj._scrollerOrigin) obj._scrollerOrigin = { x: obj.x, y: obj.y }; },
        update(obj, dt, rt, reg) {
            if (!obj._scrollerOrigin) this.init(obj);
            const speedX = reg.getParameter(obj, 'scroller', 'speedX') !== undefined ? Number(reg.getParameter(obj, 'scroller', 'speedX')) : -200;
            const speedY = reg.getParameter(obj, 'scroller', 'speedY') !== undefined ? Number(reg.getParameter(obj, 'scroller', 'speedY')) : 0;
            const resetDist = reg.getParameter(obj, 'scroller', 'resetDistance') !== undefined ? Number(reg.getParameter(obj, 'scroller', 'resetDistance')) : 1000;
            const axis = reg.getParameter(obj, 'scroller', 'axis') || 'x';
            obj.x += speedX * dt; obj.y += speedY * dt;
            if (axis === 'x') {
                if (speedX < 0 && obj.x < (obj._scrollerOrigin.x - resetDist)) obj.x += resetDist;
                else if (speedX > 0 && obj.x > (obj._scrollerOrigin.x + resetDist)) obj.x -= resetDist;
            } else {
                if (speedY < 0 && obj.y < (obj._scrollerOrigin.y - resetDist)) obj.y += resetDist;
                else if (speedY > 0 && obj.y > (obj._scrollerOrigin.y + resetDist)) obj.y -= resetDist;
            }
        }
    });
    registry.register('state_switcher', {
        update(obj, dt, rt, reg) {
            const lastAction = rt.lastAction;
            const s1ID = reg.getParameter(obj, 'state_switcher', 'state1ID');
            const s2ID = reg.getParameter(obj, 'state_switcher', 'state2ID');
            const target = reg.getParameter(obj, 'state_switcher', 'targetBehavior');

            let newSpeedX = null;
            if (lastAction === s1ID) newSpeedX = reg.getParameter(obj, 'state_switcher', 'state1SpeedX');
            else if (lastAction === s2ID) newSpeedX = reg.getParameter(obj, 'state_switcher', 'state2SpeedX');

            if (newSpeedX !== null) {
                if (target === 'scroller') {
                    const params = obj._behaviorParams || obj.behaviorParams;
                    if (params && params.scroller) params.scroller.speedX = newSpeedX;
                }
                else if (target === 'physics') { if (obj.physics) obj.physics.velocity.x = newSpeedX; }
            }
        }
    });

    registry.register('play_animation', {
        update(obj, dt, rt, reg) {
            const clipName = reg.getParameter(obj, 'play_animation', 'clipName');
            const loop = reg.getParameter(obj, 'play_animation', 'loop') !== false;
            const onFinishActionId = reg.getParameter(obj, 'play_animation', 'onFinishActionId');

            // --- GUARD: Only trigger if the behavior state is actually 'Active' ---
            if (!obj._behaviorState || obj._behaviorState['play_animation'] === false) return;

            if (rt.timelineSystem && clipName) {
                const onFinish = onFinishActionId ? () => {
                    console.log(`🏁 Animation "${clipName}" finished. Triggering action: ${onFinishActionId}`);
                    rt.lastAction = onFinishActionId;
                } : null;

                rt.timelineSystem.playClip(obj, clipName, loop, onFinish);

                // Consumption logic: Deactivate state to prevent re-play every frame
                obj._behaviorState['play_animation'] = false;
            }
        }
    });
}

function registerTransform(registry) {
    registry.register('rotate_continuous', {
        init(obj) { if (obj.rotation === undefined) obj.rotation = 0; },
        update(obj, dt, rt, reg) {
            const s = reg.getParameter(obj, 'rotate_continuous', 'speed') !== undefined ? Number(reg.getParameter(obj, 'rotate_continuous', 'speed')) : 2;
            const cwVal = reg.getParameter(obj, 'rotate_continuous', 'clockwise');
            const cw = cwVal !== undefined ? (String(cwVal) !== 'false') : true;
            obj.rotation += (cw ? 1 : -1) * s * dt * 60;
        }
    });
    registry.register('scale_breath', {
        init(obj) { if (!obj._sbT) obj._sbT = 0; if (!obj._sbOR) obj._sbOR = obj.radius || 30; if (!obj._sbOW) obj._sbOW = obj.width || 60; if (!obj._sbOH) obj._sbOH = obj.height || 60; },
        update(obj, dt, rt, reg) {
            if (!obj._sbT) this.init(obj); const min = reg.getParameter(obj, 'scale_breath', 'minScale') || 0.8; const max = reg.getParameter(obj, 'scale_breath', 'maxScale') || 1.2; const spd = reg.getParameter(obj, 'scale_breath', 'speed') || 1;
            obj._sbT += dt * spd; const scale = min + (max - min) * (Math.sin(obj._sbT) * 0.5 + 0.5);
            if (obj.type === 'circle') obj.radius = obj._sbOR * scale; else { obj.width = obj._sbOW * scale; obj.height = obj._sbOH * scale; }
        }
    });
    registry.register('color_cycle', {
        init(obj) { if (!obj._cH) obj._cH = 0; },
        update(obj, dt, rt, reg) {
            if (!obj._cH) this.init(obj); const s = reg.getParameter(obj, 'color_cycle', 'speed') || 1; const sat = reg.getParameter(obj, 'color_cycle', 'saturation') || 70; const lig = reg.getParameter(obj, 'color_cycle', 'lightness') || 50;
            obj._cH += dt * s * 60; if (obj._cH > 360) obj._cH -= 360; obj.fill = `hsl(${obj._cH}, ${sat}%, ${lig}%)`;
        }
    });
    registry.register('glow', {
        init(obj) { if (!obj._glT) obj._glT = 0; },
        update(obj, dt, rt, reg) {
            if (!obj._glT) this.init(obj); const intensity = reg.getParameter(obj, 'glow', 'intensity') || 0.3; const speed = reg.getParameter(obj, 'glow', 'speed') || 2;
            obj._glT += dt * speed; obj.shadowBlur = (Math.sin(obj._glT * Math.PI) * 0.5 + 0.5) * 20 * intensity; obj.shadowColor = reg.getParameter(obj, 'glow', 'color') || '#ffffff';
        }
    });
    registry.register('fade_cycle', {
        init(obj) { if (!obj._fcT) obj._fcT = 0; },
        update(obj, dt, rt, reg) {
            if (!obj._fcT) this.init(obj); const min = reg.getParameter(obj, 'fade_cycle', 'minOpacity') || 0.2; const max = reg.getParameter(obj, 'fade_cycle', 'maxOpacity') || 1; const spd = reg.getParameter(obj, 'fade_cycle', 'speed') || 1;
            obj._fcT += dt * spd; obj.opacity = min + (max - min) * (Math.sin(obj._fcT) * 0.5 + 0.5);
        }
    });
    registry.register('pulse', {
        init(obj) { if (!obj._pT) obj._pT = 0; if (!obj._pOR) obj._pOR = obj.radius || 30; if (!obj._pOW) obj._pOW = obj.width || 60; if (!obj._pOH) obj._pOH = obj.height || 60; if (!obj._pOS) obj._pOS = obj.size || 24; },
        update(obj, dt, rt, reg) {
            if (!obj._pT) this.init(obj); const max = reg.getParameter(obj, 'pulse', 'scale') || 1.2; const spd = reg.getParameter(obj, 'pulse', 'speed') || 1;
            obj._pT += dt * spd; const factor = (Math.sin(obj._pT * Math.PI * 2) + 1) / 2; const scale = 1 + factor * (max - 1);
            if (obj.type === 'circle') obj.radius = obj._pOR * scale; else if (obj.type === 'symbol') obj.size = obj._pOS * scale; else { obj.width = obj._pOW * scale; obj.height = obj._pOH * scale; }
        }
    });
    registry.register('fade', {
        init(obj) { if (!obj._afT) obj._afT = 0; },
        update(obj, dt, rt, reg) {
            const spd = reg.getParameter(obj, 'fade', 'speed') || 1; const mode = reg.getParameter(obj, 'fade', 'mode') || 'loop';
            if (mode === 'out') obj.opacity = Math.max(0, (obj.opacity || 1) - dt * spd); else if (mode === 'in') obj.opacity = Math.min(1, (obj.opacity || 0) + dt * spd); else { if (!obj._afT) this.init(obj); obj._afT += dt * spd; obj.opacity = 0.5 + Math.sin(obj._afT) * 0.5; }
        }
    });
    registry.register('wheel_rolling', {
        init(obj, rt, reg) { if (obj.rotation === undefined) obj.rotation = 0; obj._wO = obj.rotation; const tId = reg.getParameter(obj, 'wheel_rolling', 'targetId'); const t = tId ? (rt.getObject(tId) || rt.getObject(obj.parent)) : rt.getObject(obj.parent); obj._pSX = t ? (t.x || 0) : 0; obj._wI = true; },
        update(obj, dt, rt, reg) { if (!obj._wI) this.init(obj, rt, reg); const tId = reg.getParameter(obj, 'wheel_rolling', 'targetId'); const t = tId ? (rt.getObject(tId) || rt.getObject(obj.parent)) : rt.getObject(obj.parent); if (!t) return; const auto = reg.getParameter(obj, 'wheel_rolling', 'autoRadius') !== false; const rad = reg.getParameter(obj, 'wheel_rolling', 'radius') || 30; const rev = reg.getParameter(obj, 'wheel_rolling', 'reverse') === true; let r = rad; if (auto) { if (obj.type === 'circle') r = obj.radius || 30; else if (obj.width) r = obj.width / 2; else if (obj.size) r = obj.size / 2; } const distMoved = (t.x || 0) - (obj._pSX || 0); const circ = 2 * Math.PI * r; const deg = (distMoved / circ) * 360; obj.rotation = obj._wO + (rev ? -deg : deg); }
    });
}

function registerInteractive(registry) {
    // --- HELPERS for Click Response ---
    const playPopSound = (rt) => {
        try {
            const ctx = rt.getAudioContext();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
            g.gain.setValueAtTime(0.2, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) { }
    };
    const spawnRipple = (obj, rt) => {
        if (!rt || !rt.addObject) return;
        const ripple = {
            id: 'ripple_' + Date.now(), type: 'circle', x: obj.x, y: obj.y, radius: 5,
            fill: 'transparent', stroke: '#fff', strokeWidth: 1.5, opacity: 0.6,
            physics: { enabled: false }, _life: 0
        };
        rt.addObject(ripple);
        ripple.update = (dt) => {
            ripple._life += dt;
            const p = ripple._life / 0.4;
            ripple.radius = 5 + (p * 80); ripple.opacity = 0.6 * (1 - p);
            if (p >= 1) { rt.removeObject(ripple.id); return false; }
            return true;
        };
    };

    registry.register('click_response', {
        init(obj, rt) {
            if (!obj._crSetup) {
                obj._crSetup = true;
                obj._crActive = false;
                obj._crTime = 0;
            }
        },
        update(obj, dt, rt, reg) {
            if (!obj._crSetup) this.init(obj, rt);
            const bId = 'click_response';
            const signal = obj._behaviorState && obj._behaviorState[bId];
            const triggered = obj._justClicked || (signal && !obj._crActive);

            // Consume signal immediately to prevent auto-looping in wrapper
            if (signal) obj._behaviorState[bId] = false;

            if (triggered) {
                obj._crActive = true;
                obj._crTime = 0;
                obj._crStore = {
                    y: obj.y,
                    rotation: obj.rotation || 0,
                    radius: obj.radius || 30,
                    width: obj.width || 60,
                    height: obj.height || 60,
                    scaleX: obj.scaleX || 1,
                    scaleY: obj.scaleY || 1,
                    opacity: obj.opacity || 1
                };

                if (reg.getParameter(obj, bId, 'enableSound') !== false) playPopSound(rt);
                if (reg.getParameter(obj, bId, 'enableRipple') !== false) spawnRipple(obj, rt);
            }

            if (obj._crActive) {
                obj._crTime += dt;
                const dur = 0.6;
                const t = Math.min(1.0, obj._crTime / dur);
                const s = obj._crStore;
                if (!s) return; // Safety

                const intensity = reg.getParameter(obj, bId, 'intensity') || 5;
                const action = reg.getParameter(obj, bId, 'action') || 'bounce';

                // Premium Easing
                const pop = Math.sin(t * Math.PI) * Math.pow(2, -4 * t) * (intensity / 5);
                const elastic = (v) => v === 0 || v === 1 ? v : Math.pow(2, -10 * v) * Math.sin((v * 10 - 0.75) * (2 * Math.PI / 3)) + 1;

                if (action === 'bounce') obj.y = s.y - (pop * 50);
                else if (action === 'grow') {
                    const sc = 1 + pop * 0.5;
                    if (obj.type === 'circle') obj.radius = s.radius * sc;
                    else if (obj.width && obj.height) {
                        obj.width = s.width * sc;
                        obj.height = s.height * (1 - pop * 0.2); // Squash effect
                    } else {
                        obj.scaleX = s.scaleX * sc;
                        obj.scaleY = s.scaleY * (1 - pop * 0.2);
                    }
                } else if (action === 'spin') obj.rotation = s.rotation + (elastic(t) * 360 * (intensity / 5));
                else if (action === 'flash') obj.opacity = s.opacity * (1 - pop * 0.8);

                if (t >= 1.0) {
                    obj._crActive = false;
                    obj.y = s.y; obj.rotation = s.rotation; obj.opacity = s.opacity;
                    if (obj.type === 'circle') obj.radius = s.radius;
                    else if (obj.width && obj.height) { obj.width = s.width; obj.height = s.height; }
                    else { obj.scaleX = s.scaleX; obj.scaleY = s.scaleY; }
                    // Final kill of the wrapper state
                    if (obj._behaviorState) obj._behaviorState[bId] = false;
                } else {
                    // Keep alive in the wrapper if calling from specific modes
                    const mode = reg.getParameter(obj, bId, 'activationMode') || 'on_click';
                    if (obj._behaviorState && (mode === 'on_click' || mode === 'manual' || mode === 'on_click_toggle')) {
                        obj._behaviorState[bId] = true;
                    }
                }
            }
        }
    });
    registry.register('hover_grow', {
        init(obj) {
            if (!obj._hgSetup) {
                obj._hgSetup = true;
                obj._hgScale = 1;
                obj._oR = obj.radius || 30;
                obj._oW = obj.width || 60;
                obj._oH = obj.height || 60;
                obj._oSX = obj.scaleX || 1;
                obj._oSY = obj.scaleY || 1;
            }
        },
        update(obj, dt, rt, reg) {
            if (!obj._hgSetup) this.init(obj);
            const targetScale = reg.getParameter(obj, 'hover_grow', 'scale') || 1.5;
            const speed = reg.getParameter(obj, 'hover_grow', 'speed') || 5;
            const resetOnExit = reg.getParameter(obj, 'hover_grow', 'resetOnExit') !== false;

            const isHovering = obj.isHovered;
            const target = isHovering ? targetScale : 1;
            obj._hgScale += (target - obj._hgScale) * speed * dt;

            if (obj.type === 'circle') {
                obj.radius = obj._oR * obj._hgScale;
            } else if (obj.width && obj.height) {
                obj.width = obj._oW * obj._hgScale;
                obj.height = obj._oH * obj._hgScale;
            } else {
                obj.scaleX = obj._oSX * obj._hgScale;
                obj.scaleY = obj._oSY * obj._hgScale;
            }

            // --- Reset / Keep Alive Logic ---
            const behaviorId = 'hover_grow';
            if (isHovering) {
                if (obj._behaviorState) obj._behaviorState[behaviorId] = true;
            } else {
                const isFinished = Math.abs(obj._hgScale - 1) < 0.01;
                if (!resetOnExit || isFinished) {
                    if (obj._behaviorState) obj._behaviorState[behaviorId] = false;
                    if (resetOnExit) {
                        obj._hgScale = 1;
                        if (obj.type === 'circle') obj.radius = obj._oR;
                        else if (obj.width && obj.height) { obj.width = obj._oW; obj.height = obj._oH; }
                        else { obj.scaleX = obj._oSX; obj.scaleY = obj._oSY; }
                    }
                } else {
                    if (obj._behaviorState) obj._behaviorState[behaviorId] = true;
                }
            }
        }
    });
    registry.register('magnet', {
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return; const str = reg.getParameter(obj, 'magnet', 'strength') || 100; const rng = reg.getParameter(obj, 'magnet', 'range') || 200; const dx = rt.mouseX - obj.x; const dy = rt.mouseY - obj.y; const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < rng && dist > 0) { const f = (1 - dist / rng) * str; obj.x += (dx / dist) * f * dt; obj.y += (dy / dist) * f * dt; }
        }
    });
    registry.register('repel', {
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return; const str = reg.getParameter(obj, 'repel', 'strength') || 150; const rng = reg.getParameter(obj, 'repel', 'range') || 150; const dx = obj.x - rt.mouseX; const dy = obj.y - rt.mouseY; const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < rng && dist > 0) { const f = (1 - dist / rng) * str; obj.x += (dx / dist) * f * dt; obj.y += (dy / dist) * f * dt; }
        }
    });
    registry.register('follow_target', {
        init(obj) {
            if (!obj._fV) obj._fV = { x: 0, y: 0 };
            if (!obj._fS) {
                obj._fS = true;
                obj._oR = obj.radius || 30;
                obj._oW = obj.width || 60;
                obj._oH = obj.height || 60;
                obj._oO = obj.opacity || 1;
            }
        },
        update(obj, dt, rt, reg, callerId) {
            if (!obj._fS) this.init(obj);
            const bId = callerId || 'follow_target';
            const targetType = reg.getParameter(obj, bId, 'targetType');
            const moveMode = reg.getParameter(obj, bId, 'moveMode');
            const proximityEffect = reg.getParameter(obj, bId, 'proximityEffect');
            const autoRotate = reg.getParameter(obj, bId, 'autoRotate');

            let tx = rt.mouseX;
            let ty = rt.mouseY;

            if (targetType === 'object') {
                const targetId = reg.getParameter(obj, bId, 'targetId');
                const targetObj = rt.getObject(targetId);
                if (targetObj) { tx = targetObj.x; ty = targetObj.y; }
                else return;
            }

            if (tx === undefined || ty === undefined) return;

            const dx = tx - obj.x;
            const dy = ty - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (moveMode === 'spring' || bId === 'spring_follow') {
                const stiffness = reg.getParameter(obj, bId, 'stiffness') ?? 50;
                const damping = reg.getParameter(obj, bId, 'damping') ?? 0.8;
                obj._fV.x += (dx * stiffness) * dt;
                obj._fV.y += (dy * stiffness) * dt;
                const d = Math.pow(damping, dt * 60);
                obj._fV.x *= d; obj._fV.y *= d;
                obj.x += obj._fV.x * dt; obj.y += obj._fV.y * dt;
            } else {
                const speed = reg.getParameter(obj, bId, 'speed') ?? 20;
                const smoothness = reg.getParameter(obj, bId, 'smoothness') ?? 0.8;
                const lerpFactor = 1 - Math.pow(1 - (1 - smoothness), dt * speed);
                obj.x += dx * Math.min(lerpFactor, 1.0);
                obj.y += dy * Math.min(lerpFactor, 1.0);
            }

            if (autoRotate && dist > 2) {
                const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                let currentAngle = obj.rotation || 0;
                let adiff = targetAngle - currentAngle;
                while (adiff > 180) adiff -= 360;
                while (adiff < -180) adiff += 360;
                obj.rotation += adiff * Math.min(dt * 10, 1.0);
            }

            if (proximityEffect !== 'none') {
                const range = 300;
                const p = 1 - Math.min(dist / range, 1.0);
                if (proximityEffect === 'scale') {
                    const sc = 1 + p * 0.5;
                    if (obj.type === 'circle') obj.radius = obj._oR * sc;
                    else if (obj.width) { obj.width = obj._oW * sc; obj.height = obj._oH * sc; }
                } else if (proximityEffect === 'opacity') {
                    obj.opacity = obj._oO * (0.4 + p * 0.6);
                }
            }
        }
    });

    registry.register('follow_mouse_smooth', {
        update(obj, dt, rt, reg) { registry.get('follow_target').update(obj, dt, rt, reg, 'follow_mouse_smooth'); }
    });
    registry.register('spring_follow', {
        update(obj, dt, rt, reg) { registry.get('follow_target').update(obj, dt, rt, reg, 'spring_follow'); }
    });
    registry.register('look_at', {
        update(obj, dt, rt, reg) {
            const btId = 'look_at';
            const targetType = reg.getParameter(obj, btId, 'targetType');
            const speed = reg.getParameter(obj, btId, 'speed') || 360;
            const offset = reg.getParameter(obj, btId, 'offset') || 0;
            let tx, ty;
            if (targetType === 'object') {
                const tId = reg.getParameter(obj, btId, 'targetId');
                const tObj = rt.getObject(tId);
                if (tObj) { tx = tObj.x; ty = tObj.y; }
            } else { tx = rt.mouseX; ty = rt.mouseY; }
            if (tx === undefined || ty === undefined) return;
            const dx = tx - obj.x, dy = ty - obj.y;
            let targetAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + offset;
            let currentAngle = obj.rotation || 0;
            let diff = targetAngle - currentAngle;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            const step = speed * dt;
            if (Math.abs(diff) < step) obj.rotation = targetAngle;
            else obj.rotation += Math.sign(diff) * step;
        }
    });
    registry.register('draggable', {
        init(obj) { obj._dragVel = { x: 0, y: 0 }; },
        update(obj, dt, rt, reg) {
            if (rt.mouseX === undefined) return;

            // Sync with Core's input detection
            if (rt._draggingObj === obj && !obj._isDragging) {
                obj._isDragging = true;
            }

            // Standard detection (fallback)
            if (obj.isHovered && rt.isMouseDown && !obj._isDragging && !rt._draggingObj) {
                obj._isDragging = true;
                rt._draggingObj = obj;
            }

            if (!rt.isMouseDown && obj._isDragging) {
                obj._isDragging = false;
                if (rt._draggingObj === obj) rt._draggingObj = null;
                const throwPhy = reg.getParameter(obj, 'draggable', 'throwPhysics') === undefined ? true : reg.getParameter(obj, 'draggable', 'throwPhysics');
                if (throwPhy && obj.physics) {
                    obj.physics.velocity.x = obj._dragVel.x || 0;
                    obj.physics.velocity.y = obj._dragVel.y || 0;
                    obj.physics.enabled = true;
                }
            }
            if (obj._isDragging) {
                if (obj.physics) obj.physics.enabled = false;
                const vx = (rt.mouseX - obj.x) / dt;
                const vy = (rt.mouseY - obj.y) / dt;
                obj._dragVel.x = (obj._dragVel.x || 0) * 0.5 + vx * 0.5;
                obj._dragVel.y = (obj._dragVel.y || 0) * 0.5 + vy * 0.5;
                obj.x = rt.mouseX;
                obj.y = rt.mouseY;
            }
        }
    });
    registry.register('parallax', {
        init(obj) { if (!obj._paraBase) obj._paraBase = { x: obj.x, y: obj.y }; },
        update(obj, dt, rt, reg) { if (!rt.mouseX) return; if (!obj._paraBase) this.init(obj); const depth = reg.getParameter(obj, 'parallax', 'depth') || 10; const cx = rt.width / 2; const cy = rt.height / 2; const mx = (rt.mouseX - cx) / cx; const my = (rt.mouseY - cy) / cy; const tx = obj._paraBase.x + (mx * depth * -1); const ty = obj._paraBase.y + (my * depth * -1); obj.x += (tx - obj.x) * 5 * dt; obj.y += (ty - obj.y) * 5 * dt; }
    });
    registry.register('drag_reactor', {
        init(obj) {
            obj._isDragging = false;
            obj._lastMouse = { x: 0, y: 0 };
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX) return;
            if (obj._isDragging === undefined) {
                obj._isDragging = false;
                obj._lastMouse = { x: 0, y: 0 };
            }

            if (obj.isHovered && runtime.isMouseDown && !obj._isDragging && !runtime._draggingObj) {
                obj._isDragging = true;
                runtime._draggingObj = obj;
                obj._lastMouse = { x: runtime.mouseX, y: runtime.mouseY };
            }

            if (!runtime.isMouseDown && obj._isDragging) {
                obj._isDragging = false;
                if (runtime._draggingObj === obj) runtime._draggingObj = null;
            }

            if (obj._isDragging) {
                const currentMouse = { x: runtime.mouseX, y: runtime.mouseY };
                const axis = registry.getParameter(obj, 'drag_reactor', 'axis');
                const delta = (axis === 'x') ? (currentMouse.x - obj._lastMouse.x) : (currentMouse.y - obj._lastMouse.y);

                obj.x += (currentMouse.x - obj._lastMouse.x);
                obj.y += (currentMouse.y - obj._lastMouse.y);
                obj._lastMouse = currentMouse;

                const targetName = registry.getParameter(obj, 'drag_reactor', 'targetName');
                const targetProp = registry.getParameter(obj, 'drag_reactor', 'targetProperty');
                const sensitivity = registry.getParameter(obj, 'drag_reactor', 'sensitivity');

                if (targetName) {
                    const findByName = (name) => {
                        return runtime.objects.find(o => o.name === name || o.id === name) ||
                            (runtime.controls && runtime.controls.find(c => c.name === name || c.id === name)) ||
                            (runtime.graphs && runtime.graphs.find(g => g.name === name || g.id === name));
                    };

                    let target = runtime.getObject(targetName) || findByName(targetName);
                    if (target) {
                        if (targetProp === 'rotation') {
                            target.rotation = (target.rotation || 0) + (delta * sensitivity * 0.05);
                        } else if (targetProp === 'x') {
                            target.x += delta * sensitivity;
                        } else if (targetProp === 'y') {
                            target.y += delta * sensitivity;
                        } else if (targetProp === 'scale') {
                            target.scale = (target.scale || 1) + (delta * sensitivity * 0.01);
                        } else if (targetProp === 'opacity') {
                            target.opacity = Math.max(0, Math.min(1, (target.opacity || 1) + (delta * sensitivity * 0.01)));
                        }
                    }
                }
            }
        }
    }
    );

    // Tale Pop - Universal Narrative Message System
    registry.register('tale_pop', {
        init(obj) {
            obj._talePopSetup = true;
            obj._talePopShown = false;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._talePopSetup) this.init(obj);

            const bId = 'tale_pop';
            const signal = obj._behaviorState && obj._behaviorState[bId];
            const triggered = obj._justClicked || (signal && !obj._talePopShown);

            // --- CONDITION CHECK ---
            const condition = registry.getParameter(obj, bId, 'condition');
            if (condition && triggered) {
                try {
                    if (condition.includes('>')) {
                        const [varName, val] = condition.split('>').map(s => s.trim());
                        const v = runtime.getVariable(varName) ?? (window.OviTrackers?.[varName] ?? 0);
                        if (v <= Number(val)) return; // Fail
                    }
                    else if (condition.includes('<')) {
                        const [varName, val] = condition.split('<').map(s => s.trim());
                        const v = runtime.getVariable(varName) ?? (window.OviTrackers?.[varName] ?? 0);
                        if (v >= Number(val)) return;
                    }
                    else if (condition.includes('=')) {
                        const [varName, val] = condition.split('=').map(s => s.trim());
                        const v = runtime.getVariable(varName) ?? (window.OviTrackers?.[varName] ?? 0);
                        if (v != Number(val)) return;
                    }
                } catch (e) { }
            }

            if (triggered && !obj._talePopShown) {
                obj._talePopShown = true;
                if (signal) obj._behaviorState[bId] = false;

                const message = registry.getParameter(obj, bId, 'message') || 'A new discovery!';
                const title = registry.getParameter(obj, bId, 'title') || '';
                const position = registry.getParameter(obj, bId, 'position') || 'center';
                const animationType = registry.getParameter(obj, bId, 'animationType') || 'fade';
                const duration = registry.getParameter(obj, bId, 'duration') || 0.5;
                const autoClose = registry.getParameter(obj, bId, 'autoClose');
                const closeDelay = registry.getParameter(obj, bId, 'closeDelay') || 5;
                const showAvatar = registry.getParameter(obj, bId, 'showAvatar');
                const avatarUrl = registry.getParameter(obj, bId, 'avatarUrl') || '';
                const characterName = registry.getParameter(obj, bId, 'characterName') || '';
                const soundUrl = registry.getParameter(obj, bId, 'soundUrl') || '';
                const backgroundColor = registry.getParameter(obj, bId, 'backgroundColor') || '#1a1a1a';
                const textColor = registry.getParameter(obj, bId, 'textColor') || '#ffffff';
                const fontSize = registry.getParameter(obj, bId, 'fontSize') || 16;
                const enableChoices = registry.getParameter(obj, bId, 'enableChoices');
                const choicesStr = registry.getParameter(obj, bId, 'choices') || '';
                const typewriterSound = registry.getParameter(obj, bId, 'typewriterSound'); // New parameter

                // --- ULTIMATE FEATURES ---
                const voiceUrl = registry.getParameter(obj, bId, 'voiceUrl');
                const avatarSvg = registry.getParameter(obj, bId, 'avatarSvg'); // Raw SVG string
                const emotionsStr = registry.getParameter(obj, bId, 'emotions'); // JSON: { "happy": "<svg...>", "angry": "<svg...>" }
                const activeEmotion = registry.getParameter(obj, bId, 'emotion') || 'neutral';
                const bubbleMode = registry.getParameter(obj, bId, 'bubbleMode'); // 'anchored' or 'screen' (default)

                let choices = [];
                if (enableChoices && choicesStr) {
                    try { choices = JSON.parse(choicesStr); } catch (e) { }
                }

                let emotions = {};
                if (emotionsStr) { try { emotions = JSON.parse(emotionsStr); } catch (e) { } }

                // Resolve final avatar (Emotion > Raw SVG > URL)
                let finalAvatarSvg = avatarSvg;
                if (activeEmotion && emotions[activeEmotion]) {
                    finalAvatarSvg = emotions[activeEmotion];
                }

                showTalePop({
                    message, title, position, animationType, duration,
                    autoClose, closeDelay, showAvatar, avatarUrl, characterName,
                    soundUrl, backgroundColor, textColor, fontSize,
                    enableChoices, choices, runtime, typewriterSound,
                    voiceUrl, avatarSvg: finalAvatarSvg, bubbleMode, targetObj: obj
                });
            }
        }
    });

    // Progress Tracker - Universal Score/Progress System
    registry.register('progress_tracker', {
        init(obj) {
            obj._trackerSetup = true;
            if (!window.OviTrackers) window.OviTrackers = {};
        },
        update(obj, dt, runtime, registry) {
            if (!obj._trackerSetup) this.init(obj);

            const bId = 'progress_tracker';
            const signal = obj._behaviorState && obj._behaviorState[bId];
            const triggered = obj._justClicked || (signal && !obj._trackerTriggered);

            if (triggered) {
                obj._trackerTriggered = true;
                if (signal) obj._behaviorState[bId] = false;
                setTimeout(() => obj._trackerTriggered = false, 100);

                const trackerId = registry.getParameter(obj, bId, 'trackerId') || 'score';
                const amount = registry.getParameter(obj, bId, 'amount') || 10;
                const operation = registry.getParameter(obj, bId, 'operation') || 'add';
                const showNotification = registry.getParameter(obj, bId, 'showNotification');
                const notificationText = registry.getParameter(obj, bId, 'notificationText') || '';
                const notificationColor = registry.getParameter(obj, bId, 'notificationColor') || '#4CAF50';
                const playSound = registry.getParameter(obj, bId, 'playSound');
                const soundUrl = registry.getParameter(obj, bId, 'soundUrl') || '';
                const particleEffect = registry.getParameter(obj, bId, 'particleEffect');
                const particleColor = registry.getParameter(obj, bId, 'particleColor') || '#FFD700';
                const updateUI = registry.getParameter(obj, bId, 'updateUI');
                const uiElementId = registry.getParameter(obj, bId, 'uiElementId') || '';
                const saveToStorage = registry.getParameter(obj, bId, 'saveToStorage');
                const maxValue = registry.getParameter(obj, bId, 'maxValue') || 100;
                const minValue = registry.getParameter(obj, bId, 'minValue') || 0;

                const tooltip = registry.getParameter(obj, bId, 'tooltip');
                if (tooltip) {
                    if (obj.isHovered) showTooltip(obj, tooltip, runtime);
                    else hideTooltip(obj);
                }

                updateTracker({ trackerId, amount, operation, maxValue, minValue, saveToStorage, showNotification, notificationText, notificationColor, playSound, soundUrl, particleEffect, particleColor, updateUI, uiElementId, obj, runtime });
            }
        }
    });

    registry.register('collision_trigger', {
        update(obj, dt, rt, reg) {
            // Sync property
            obj.killParticles = reg.getParameter(obj, 'collision_trigger', 'killParticles');

            if (!obj.activeCollisions || obj.activeCollisions.length === 0) return;
            const targetTag = reg.getParameter(obj, 'collision_trigger', 'targetTag');
            const action = reg.getParameter(obj, 'collision_trigger', 'action');
            if (!targetTag) return;
            const hit = obj.activeCollisions.find(other => other.tags && other.tags.includes(targetTag));
            if (hit) {
                if (action === 'bounce') {
                    if (obj.physics && obj.physics.velocity) {
                        const dx = obj.x - hit.x;
                        const dy = obj.y - hit.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        obj.physics.velocity.x = (dx / dist) * 300;
                        obj.physics.velocity.y = (dy / dist) * 300;
                    }
                } else if (action === 'destroy') {
                    obj._shouldDestroy = true;
                } else if (action === 'color_change') {
                    const col = reg.getParameter(obj, 'collision_trigger', 'color');
                    obj.fill = col;
                } else if (action === 'fade_out') {
                    obj.opacity = (obj.opacity || 1) - dt * 2;
                    if (obj.opacity < 0) obj._shouldDestroy = true;
                }
            }
        }
    });

    registry.register('shake', {
        name: 'Shake',
        description: 'Shake object (use Manual activation to trigger on Event)',
        init(obj) {
            obj._shakeTime = 0; obj._shakeActive = false; obj._shakeStarted = false;
        },
        update(obj, dt, runtime, registry) {
            const intensity = registry.getParameter(obj, 'shake', 'intensity') || 5;
            const duration = registry.getParameter(obj, 'shake', 'duration') || 0.5;
            const actMode = registry.getParameter(obj, 'shake', 'activationMode') || 'on_enter';

            if (obj._behaviorState && obj._behaviorState['shake']) {
                obj._shakeActive = true; obj._shakeTime = duration; obj._behaviorState['shake'] = false;
            }
            if (actMode === 'manual') {
                const actId = registry.getParameter(obj, 'shake', 'activationId');
                if (actId && runtime.lastAction === actId) { obj._shakeActive = true; obj._shakeTime = duration; }
            }
            if (actMode === 'on_hover' && obj.isHovered) { obj._shakeActive = true; obj._shakeTime = Math.max(obj._shakeTime || 0, 0.1); }
            if (actMode === 'on_enter' && !obj._shakeStarted) { obj._shakeActive = true; obj._shakeTime = duration; obj._shakeStarted = true; }

            if (obj._shakeActive && obj._shakeTime > 0) {
                obj._shakeTime -= dt;
                const factor = intensity * 200;
                const rx = (Math.random() - 0.5) * factor; const ry = (Math.random() - 0.5) * factor;

                if (obj.physics && obj.physics.enabled) {
                    if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
                    obj.physics.velocity.x += rx; obj.physics.velocity.y += ry;
                } else {
                    if (!obj._shakeOrigX) { obj._shakeOrigX = obj.x; obj._shakeOrigY = obj.y; }
                    obj.x = obj._shakeOrigX + (Math.random() - 0.5) * intensity * 5;
                    obj.y = obj._shakeOrigY + (Math.random() - 0.5) * intensity * 5;
                }

                if (obj._shakeTime <= 0) {
                    obj._shakeActive = false;
                    if (obj._shakeOrigX !== undefined) {
                        obj.x = obj._shakeOrigX; obj.y = obj._shakeOrigY;
                        delete obj._shakeOrigX; delete obj._shakeOrigY;
                    }
                }
            }
        }
    });

}

function registerText(registry) {
    registry.register('typewriter', {
        init(obj, rt, reg) {
            if (obj._typewriterInited && !obj._forceReset) return;
            obj._twState = 'WAITING';
            obj._twTextIndex = 0;
            obj._twCharIndex = 0;
            obj._twTimer = 0;
            obj._twCharTimer = 0;
            obj._twQueue = [];
            const list = reg.getParameter(obj, 'typewriter', 'textList') || '';
            if (list.trim()) obj._twQueue = list.split(',').map(s => s.trim());
            else obj._twQueue = [obj.text || 'New Text'];
            obj._twCurrentFull = obj._twQueue[0] || '';
            obj.text = '';
            const delay = Number(reg.getParameter(obj, 'typewriter', 'delay') || 0);
            obj._twTimer = delay / 1000;
            obj._typewriterInited = true;
            obj._forceReset = false;
        },
        update(obj, dt, rt, reg) {
            if (obj.type !== 'text') return;
            const actMode = reg.getParameter(obj, 'typewriter', 'activationMode') || 'on_enter';
            if (actMode === 'manual' && (!obj._behaviorState || !obj._behaviorState['typewriter'])) { obj.text = ''; return; }
            if (!obj._typewriterInited) this.init(obj, rt, reg);

            // Parameter Sync & Reset Check
            const currentList = reg.getParameter(obj, 'typewriter', 'textList') || '';
            if (obj._lastListParam !== currentList) { obj._lastListParam = currentList; obj._forceReset = true; this.init(obj, rt, reg); }

            const speed = reg.getParameter(obj, 'typewriter', 'speed') || 20;
            const variability = reg.getParameter(obj, 'typewriter', 'variability') || 0;
            const puncPause = (reg.getParameter(obj, 'typewriter', 'punctuationPause') || 0) / 1000;
            const scramble = reg.getParameter(obj, 'typewriter', 'scramble');
            const scrambleDur = (reg.getParameter(obj, 'typewriter', 'scrambleDuration') || 300) / 1000;
            const loop = reg.getParameter(obj, 'typewriter', 'loop');
            const autoErase = reg.getParameter(obj, 'typewriter', 'autoErase');
            const eraseSpeed = reg.getParameter(obj, 'typewriter', 'eraseSpeed') || 50;
            const eraseDelay = (reg.getParameter(obj, 'typewriter', 'eraseDelay') || 1500) / 1000;
            const tapToSkip = reg.getParameter(obj, 'typewriter', 'tapToSkip');
            const soundEnabled = reg.getParameter(obj, 'typewriter', 'soundEffect');
            const showCursor = reg.getParameter(obj, 'typewriter', 'showCursor');
            const cursorChar = reg.getParameter(obj, 'typewriter', 'cursorChar') || '|';

            obj._twTimer -= dt;
            if (tapToSkip && (rt.isMouseDown || rt._justClicked || obj._justClicked)) {
                if (obj._twState === 'TYPING' || obj._twState === 'SCRAMBLE_RUN' || obj._twState === 'WAITING') {
                    obj._twCharIndex = obj._twCurrentFull.length; obj.text = obj._twCurrentFull;
                    obj._twState = 'PAUSING'; obj._twTimer = eraseDelay; return;
                }
            }
            if (obj._twTimer > 0) return;

            if (obj._twState === 'WAITING') { obj._twState = scramble ? 'SCRAMBLING' : 'TYPING'; obj._twTimer = 0; }
            if (obj._twState === 'SCRAMBLING') { obj._twTimer = scrambleDur; obj._twState = 'SCRAMBLE_RUN'; }
            if (obj._twState === 'SCRAMBLE_RUN') {
                if (obj._twTimer <= 0) obj._twState = 'TYPING';
                else {
                    const glyphs = '$%#*+=-_&^@!<>?'; let scrambled = '';
                    for (let n = 0; n < obj._twCurrentFull.length; n++) scrambled += glyphs[Math.floor(Math.random() * glyphs.length)];
                    obj.text = scrambled; return;
                }
            }

            if (obj._twState === 'TYPING') {
                obj._twCharTimer -= dt;
                if (obj._twCharTimer <= 0) {
                    obj._twCharIndex++;
                    if (obj._twCharIndex > obj._twCurrentFull.length) {
                        obj._twState = 'PAUSING'; obj._twTimer = eraseDelay;
                        const finishAct = reg.getParameter(obj, 'typewriter', 'onFinishAction');
                        const finishID = reg.getParameter(obj, 'typewriter', 'onFinishID');
                        if (finishAct && finishAct !== 'none' && rt.ui && rt.ui.triggerAction) rt.ui.triggerAction(finishAct, obj, finishID);
                    } else {
                        const char = obj._twCurrentFull[obj._twCharIndex - 1];
                        let nextDelay = (1 / speed);
                        if (variability > 0) nextDelay *= (1 + (Math.random() - 0.5) * variability * 2);
                        if (['.', ',', '?', '!', ':'].includes(char)) nextDelay += puncPause;
                        obj._twCharTimer = nextDelay;
                        obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex);
                        if (showCursor) obj.text += cursorChar;
                        if (soundEnabled) this.playTypeSound();
                    }
                }
            } else if (obj._twState === 'PAUSING') {
                if (obj._twTimer <= 0) {
                    if (autoErase) obj._twState = 'ERASING';
                    else if (obj._twQueue.length > 1) this.typewriterNextMessage(obj, scramble);
                    else if (loop) { obj._forceReset = true; this.init(obj, rt, reg); }
                }
            } else if (obj._twState === 'ERASING') {
                obj._twCharTimer -= dt;
                if (obj._twCharTimer <= 0) {
                    obj._twCharIndex--;
                    if (obj._twCharIndex < 0) this.typewriterNextMessage(obj, scramble);
                    else {
                        obj._twCharTimer = (1 / eraseSpeed);
                        obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex);
                        if (showCursor) obj.text += cursorChar;
                        if (soundEnabled) this.playTypeSound();
                    }
                }
            }

            if ((obj._twState === 'PAUSING' || (obj._twState === 'TYPING' && obj._twCharIndex === obj._twCurrentFull.length)) && showCursor) {
                if (Math.floor(Date.now() / 500) % 2 === 0) obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex) + cursorChar;
                else obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex);
            }
        },
        typewriterNextMessage(obj, scramble) {
            obj._twTextIndex = (obj._twTextIndex + 1) % obj._twQueue.length;
            obj._twCurrentFull = obj._twQueue[obj._twTextIndex];
            obj._twCharIndex = 0; obj._twState = scramble ? 'SCRAMBLING' : 'TYPING';
        },
        playTypeSound(rt) {
            if (!rt || !rt.getAudioContext) return;
            const ctx = rt.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.05);
        }
    });
    registry.register('pulse_text', {
        init(obj) { if (!obj._baseFS) obj._baseFS = obj.fontSize || 20; if (!obj._pT) obj._pT = 0; },
        update(obj, dt, rt, reg) { if (!obj._baseFS) this.init(obj); const s = reg.getParameter(obj, 'pulse_text', 'speed') || 2; const m = reg.getParameter(obj, 'pulse_text', 'scale') || 1.5; obj._pT += dt; const sine = (Math.sin(obj._pT * s) + 1) / 2; obj.fontSize = obj._baseFS * (1 + (sine * (m - 1))); }
    });
    registry.register('rainbow_text', {
        init(obj) { if (obj._rT === undefined) obj._rT = 0; },
        update(obj, dt, rt, reg) { if (obj._rT === undefined) this.init(obj); const s = reg.getParameter(obj, 'rainbow_text', 'speed') || 5; obj._rT += dt * s; obj.fill = `hsl(${Math.floor(obj._rT * 50) % 360}, 100%, 50%)`; }
    });
}

function registerLogic(registry) {
    registry.register('timer_events', {
        init(obj) {
            obj._wasRunning = obj.isRunning;
            obj._m1Fired = false;
            obj._m2Fired = false;
            obj._initialTime = obj.duration || obj.currentTime || 5;
            obj._isTimerInit = true;
        },
        update(obj, dt, rt, reg) {
            if (obj.type !== 'timer') return;
            if (!obj._isTimerInit) this.init(obj);

            const mode = reg.getParameter(obj, 'timer_events', 'mode') || 'single';
            const speedVar = reg.getParameter(obj, 'timer_events', 'speedVariable');
            const autoRestart = reg.getParameter(obj, 'timer_events', 'autoRestart');

            // 1. Variable Speed
            if (speedVar && rt.variables && rt.variables[speedVar] !== undefined) {
                const speedMult = rt.variables[speedVar];
                if (speedMult !== 1 && obj.isRunning) {
                    obj.currentTime -= dt * (speedMult - 1);
                }
            }

            const totalDuration = obj.duration || obj._initialTime || 1;
            const progress = (obj.currentTime / totalDuration) * 100;

            // 2. Milestones
            const m1 = reg.getParameter(obj, 'timer_events', 'milestone1');
            const m1Id = reg.getParameter(obj, 'timer_events', 'm1ActionId');
            const m2 = reg.getParameter(obj, 'timer_events', 'milestone2');
            const m2Id = reg.getParameter(obj, 'timer_events', 'm2ActionId');

            if (obj.isRunning) {
                if (m1 !== undefined && !obj._m1Fired && progress <= m1) {
                    rt.triggerAction('emit_action', obj, m1Id);
                    obj._m1Fired = true;
                }
                if (m2 !== undefined && !obj._m2Fired && progress <= m2) {
                    rt.triggerAction('emit_action', obj, m2Id);
                    obj._m2Fired = true;
                }
            }

            // 3. Finish Edge
            if (obj._wasRunning && !obj.isRunning && obj.currentTime <= 0) {
                const action = reg.getParameter(obj, 'timer_events', 'onFinishAction') || 'emit_action';
                const emitId = reg.getParameter(obj, 'timer_events', 'emitActionId');

                if (action && action !== 'none') {
                    rt.triggerAction(action, obj, emitId);
                }

                if (autoRestart || mode === 'interval') {
                    obj.currentTime = totalDuration;
                    obj.isRunning = true;
                    obj._m1Fired = false;
                    obj._m2Fired = false;
                }
            }
            obj._wasRunning = obj.isRunning;
        }
    });
    registry.register('value_threshold', {
        update(obj, dt, rt, reg) {
            const prop = reg.getParameter(obj, 'value_threshold', 'property'); const op = reg.getParameter(obj, 'value_threshold', 'operator'); const val = reg.getParameter(obj, 'value_threshold', 'threshold');
            let currentVal = obj[prop]; if (prop && prop.includes('.')) { const parts = prop.split('.'); let target = obj; for (let p of parts) { if (target) target = target[p]; else break; } currentVal = target; } if (currentVal === undefined) return;
            let conditionMet = false; const numVal = parseFloat(val); const numCurr = parseFloat(currentVal); if (!isNaN(numVal) && !isNaN(numCurr)) { if (op === '>' && numCurr > numVal) conditionMet = true; if (op === '<' && numCurr < numVal) conditionMet = true; if (op === '=' && Math.abs(numCurr - numVal) < 0.001) conditionMet = true; if (op === '!=' && Math.abs(numCurr - numVal) > 0.001) conditionMet = true; } else { if (op === '=' && currentVal == val) conditionMet = true; if (op === '!=' && currentVal != val) conditionMet = true; }
            if (conditionMet) { const action = reg.getParameter(obj, 'value_threshold', 'action'); const actId = reg.getParameter(obj, 'value_threshold', 'actionId'); if (rt.ui && rt.ui.triggerAction) rt.ui.triggerAction(action, obj, actId); }
        }
    });
}

function registerTrigger(registry) {
    registry.register('action_animation', {
        init(obj) {
            obj._animTime = 0; obj._animActive = false;
            obj._origScale = obj.scale || 1; obj._origOpacity = obj.opacity !== undefined ? obj.opacity : 1;
            obj._origRotation = obj.rotation || 0; obj._origX = obj.x; obj._origY = obj.y;
        },
        update(obj, dt, runtime, registry) {
            const actionID = registry.getParameter(obj, 'action_animation', 'actionID');
            const animation = registry.getParameter(obj, 'action_animation', 'animation');
            const duration = registry.getParameter(obj, 'action_animation', 'duration') || 0.5;
            const intensity = registry.getParameter(obj, 'action_animation', 'intensity') || 1;

            if (runtime.lastAction === actionID && !obj._animActive) {
                obj._animActive = true; obj._animTime = 0;
                obj._origScale = obj.scale || 1; obj._origOpacity = obj.opacity !== undefined ? obj.opacity : 1;
                obj._origRotation = obj.rotation || 0; obj._origX = obj.x; obj._origY = obj.y;
            }

            if (obj._animActive) {
                obj._animTime += dt;
                const progress = obj._animTime / duration;
                if (progress >= 1) {
                    obj._animActive = false;
                    if (obj._origScale !== undefined) obj.scale = obj._origScale;
                    if (obj._origOpacity !== undefined) obj.opacity = obj._origOpacity;
                    if (obj._origRotation !== undefined) obj.rotation = obj._origRotation;
                    if (obj._origX !== undefined) obj.x = obj._origX;
                    if (obj._origY !== undefined) obj.y = obj._origY;
                    return;
                }
                if (animation === 'bump') {
                    const s = Math.sin(progress * Math.PI);
                    obj.scale = (obj._origScale || 1) + (s * 0.2 * intensity);
                } else if (animation === 'flash') {
                    const s = Math.sin(progress * Math.PI);
                    obj.opacity = Math.max(0, (obj._origOpacity || 1) - (s * 0.8 * intensity));
                } else if (animation === 'spin') {
                    obj.rotation = (obj._origRotation || 0) + (progress * 360 * intensity);
                } else if (animation === 'shake') {
                    const shake = Math.sin(progress * Math.PI * 10) * 5 * intensity * (1 - progress);
                    obj.x = (obj._origX || 0) + shake;
                } else if (animation === 'float_up') {
                    obj.y = (obj._origY || 0) - (progress * 50 * intensity);
                    obj.opacity = (obj._origOpacity || 1) * (1 - progress);
                }
            }
        }
    });
}

function registerRuntimePathBehaviors(registry) {
    // Figure Eight
    registry.register('figure_eight', {
        init(obj) { if (!obj._figureTime) obj._figureTime = 0; },
        update(obj, dt, runtime, registry) {
            if (!obj._figureTime) this.init(obj);
            const width = registry.getParameter(obj, 'figure_eight', 'width') || 100;
            const height = registry.getParameter(obj, 'figure_eight', 'height') || 80;
            const speed = registry.getParameter(obj, 'figure_eight', 'speed') || 1;
            const centerX = registry.getParameter(obj, 'figure_eight', 'centerX') || 400;
            const centerY = registry.getParameter(obj, 'figure_eight', 'centerY') || 300;
            const orient = registry.getParameter(obj, 'figure_eight', 'orient');

            obj._figureTime += dt * speed;
            const t = obj._figureTime;
            obj.x = centerX + width * Math.sin(t);
            obj.y = centerY + height * Math.sin(t) * Math.cos(t);

            if (orient) {
                const dx = width * Math.cos(t);
                const dy = height * Math.cos(2 * t);
                obj.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
            }
        }
    });

    // Circle Path
    registry.register('circle_path', {
        init(obj) { if (!obj._circleAngle) obj._circleAngle = 0; },
        update(obj, dt, runtime, registry) {
            if (!obj._circleAngle) this.init(obj);
            const radius = registry.getParameter(obj, 'circle_path', 'radius') || 100;
            const speed = registry.getParameter(obj, 'circle_path', 'speed') || 1;
            const centerX = registry.getParameter(obj, 'circle_path', 'centerX') || 400;
            const centerY = registry.getParameter(obj, 'circle_path', 'centerY') || 300;
            const orient = registry.getParameter(obj, 'circle_path', 'orient');

            obj._circleAngle += dt * speed;
            obj.x = centerX + Math.cos(obj._circleAngle) * radius;
            obj.y = centerY + Math.sin(obj._circleAngle) * radius;

            if (orient) {
                const dx = -radius * Math.sin(obj._circleAngle) * speed;
                const dy = radius * Math.cos(obj._circleAngle) * speed;
                obj.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
            }
        }
    });

    // Random Walk
    registry.register('random_walk', {
        init(obj) {
            if (obj._walkAngle === undefined) {
                obj._walkAngle = Math.random() * Math.PI * 2;
                obj._targetAngle = obj._walkAngle;
                obj._walkTimer = 0;
            }
        },
        update(obj, dt, runtime, registry) {
            if (obj._walkAngle === undefined) this.init(obj);

            const speed = registry.getParameter(obj, 'random_walk', 'speed') || 100;
            const turnIntensity = registry.getParameter(obj, 'random_walk', 'turnIntensity') || 0.5;
            const smoothness = registry.getParameter(obj, 'random_walk', 'smoothness') || 0.8;
            const changeFrequency = registry.getParameter(obj, 'random_walk', 'changeFrequency') || 1;
            const orient = registry.getParameter(obj, 'random_walk', 'orient');
            const stayInBounds = registry.getParameter(obj, 'random_walk', 'stayInBounds');

            // 1. Direction Logic
            obj._walkTimer += dt * changeFrequency;
            if (obj._walkTimer > 1) {
                const variance = turnIntensity * Math.PI;
                obj._targetAngle += (Math.random() - 0.5) * variance;
                obj._walkTimer = 0;
            }

            // 2. Smooth Interpolation (Steering)
            let angleDiff = obj._targetAngle - obj._walkAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            const lerpFactor = 1 - smoothness;
            obj._walkAngle += angleDiff * lerpFactor;

            // 3. Move
            obj.x += Math.cos(obj._walkAngle) * speed * dt;
            obj.y += Math.sin(obj._walkAngle) * speed * dt;

            // 4. Stay In Bounds (Bounce logic)
            if (stayInBounds && runtime && runtime.width) {
                const padding = 20;
                let bounced = false;
                if (obj.x < padding) { obj.x = padding; obj._targetAngle = 0; bounced = true; }
                if (obj.x > runtime.width - padding) { obj.x = runtime.width - padding; obj._targetAngle = Math.PI; bounced = true; }
                if (obj.y < padding) { obj.y = padding; obj._targetAngle = Math.PI / 2; bounced = true; }
                if (obj.y > runtime.height - padding) { obj.y = runtime.height - padding; obj._targetAngle = -Math.PI / 2; bounced = true; }

                if (bounced) {
                    obj._walkAngle = obj._targetAngle;
                    obj._walkTimer = 0;
                }
            }

            // 5. Orient
            if (orient) {
                obj.rotation = obj._walkAngle * 180 / Math.PI;
            }
        }
    });

    // Bounce Path
    registry.register('bounce_path', {
        init(obj, runtime, registry) {
            const speed = registry.getParameter(obj, 'bounce_path', 'speed') || 300;
            const angleDeg = registry.getParameter(obj, 'bounce_path', 'angle') || -45;
            const angleRad = angleDeg * Math.PI / 180;

            obj._bounceVelX = Math.cos(angleRad) * speed;
            obj._bounceVelY = Math.sin(angleRad) * speed;
            obj._isBounceInit = true;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._isBounceInit) this.init(obj, runtime, registry);

            const mode = registry.getParameter(obj, 'bounce_path', 'mode') || 'projectile';
            const gravity = registry.getParameter(obj, 'bounce_path', 'gravity') !== undefined ? registry.getParameter(obj, 'bounce_path', 'gravity') : 800;
            const bounciness = registry.getParameter(obj, 'bounce_path', 'bounciness') !== undefined ? registry.getParameter(obj, 'bounce_path', 'bounciness') : 0.7;
            const groundY = registry.getParameter(obj, 'bounce_path', 'groundY') !== undefined ? registry.getParameter(obj, 'bounce_path', 'groundY') : 550;
            const friction = registry.getParameter(obj, 'bounce_path', 'friction') || 0;
            const randomness = registry.getParameter(obj, 'bounce_path', 'randomness') || 0;
            const orient = registry.getParameter(obj, 'bounce_path', 'orient');

            // 1. Physics Logic
            if (mode === 'projectile') {
                obj._bounceVelY += gravity * dt;
            }

            // Apply friction
            if (friction > 0) {
                const loss = 1 - (friction * dt);
                obj._bounceVelX *= loss;
                obj._bounceVelY *= loss;
            }

            obj.x += obj._bounceVelX * dt;
            obj.y += obj._bounceVelY * dt;

            // 2. Collision Logic
            const width = obj.width || 50;
            const height = obj.height || 50;
            const halfW = width / 2;
            const halfH = height / 2;

            if (mode === 'projectile') {
                if (obj.y + halfH > groundY) {
                    obj.y = groundY - halfH;
                    obj._bounceVelY *= -bounciness;
                    obj._bounceVelX += (Math.random() - 0.5) * randomness * 100;
                }
                if (runtime && runtime.width) {
                    if (obj.x - halfW < 0 || obj.x + halfW > runtime.width) {
                        obj._bounceVelX *= -bounciness;
                        obj.x = obj.x < halfW ? halfW : runtime.width - halfW;
                    }
                }
            } else {
                if (runtime && runtime.width) {
                    let collided = false;
                    if (obj.x - halfW < 0 || obj.x + halfW > runtime.width) {
                        obj._bounceVelX *= -1;
                        obj.x = obj.x < halfW ? halfW : runtime.width - halfW;
                        collided = true;
                    }
                    if (obj.y - halfH < 0 || obj.y + halfH > runtime.height) {
                        obj._bounceVelY *= -1;
                        obj.y = obj.y < halfH ? halfH : runtime.height - halfH;
                        collided = true;
                    }
                    if (collided && randomness > 0) {
                        const currentAngle = Math.atan2(obj._bounceVelY, obj._bounceVelX);
                        const currentSpeed = Math.sqrt(obj._bounceVelX ** 2 + obj._bounceVelY ** 2);
                        const newAngle = currentAngle + (Math.random() - 0.5) * randomness;
                        obj._bounceVelX = Math.cos(newAngle) * currentSpeed;
                        obj._bounceVelY = Math.sin(newAngle) * currentSpeed;
                    }
                }
            }

            // 3. Orient
            if (orient) {
                obj.rotation = Math.atan2(obj._bounceVelY, obj._bounceVelX) * 180 / Math.PI;
            }
        }
    });

    registry.register('follow_path', {
        init(obj) {
            if (obj._pathProgress === undefined) obj._pathProgress = 0;
            if (obj._pathDir === undefined) obj._pathDir = 1;
        },
        update(obj, dt, runtime, registry) {
            const pathId = registry.getParameter(obj, 'follow_path', 'pathId');
            const pathObj = runtime.getObject(pathId);
            if (!pathObj || (pathObj.type !== 'path' && pathObj.type !== 'vector_path')) return;

            const speed = registry.getParameter(obj, 'follow_path', 'speed') || 0.2;
            const loop = registry.getParameter(obj, 'follow_path', 'loop');
            const pingPong = registry.getParameter(obj, 'follow_path', 'pingPong');
            const orient = registry.getParameter(obj, 'follow_path', 'orient');

            if (obj._pathProgress === undefined) this.init(obj);
            if (obj._pathDir === undefined) obj._pathDir = 1;

            obj._pathProgress += dt * speed * obj._pathDir;

            if (obj._pathProgress > 1) {
                if (pingPong) { obj._pathProgress = 1; obj._pathDir = -1; }
                else if (loop) { obj._pathProgress %= 1; }
                else { obj._pathProgress = 1; }
            } else if (obj._pathProgress < 0) {
                if (pingPong) { obj._pathProgress = 0; obj._pathDir = 1; }
                else if (loop) { obj._pathProgress = 1; }
                else { obj._pathProgress = 0; }
            }

            const tension = pathObj.tension !== undefined ? pathObj.tension : 0.5;
            const pos = runtime.getSplinePoint(pathObj.points, tension, obj._pathProgress, pathObj.closed);

            if (orient && obj._pathProgress < 1) {
                const nextT = Math.max(0, Math.min(1, obj._pathProgress + 0.01 * obj._pathDir));
                const nextPos = runtime.getSplinePoint(pathObj.points, tension, nextT, pathObj.closed);
                const angle = Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x) * 180 / Math.PI;
                obj.rotation = angle;
            }
            obj.x = pos.x + (pathObj.x || 0); obj.y = pos.y + (pathObj.y || 0);
        }
    });

    registry.register('scrub_path', {
        init(obj) {
            obj._scrubTarget = 0;
            obj._scrubCurrent = 0;
            obj._isScrubInit = true;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._isScrubInit) this.init(obj);

            const pathId = registry.getParameter(obj, 'scrub_path', 'pathId');
            const pathObj = runtime.getObject(pathId);
            if (!pathObj || (pathObj.type !== 'path' && pathObj.type !== 'vector_path')) return;

            const mode = registry.getParameter(obj, 'scrub_path', 'inputMode') || 'manual';
            const smoothing = registry.getParameter(obj, 'scrub_path', 'smoothing') !== undefined ? registry.getParameter(obj, 'scrub_path', 'smoothing') : 0.8;
            const rangeMin = registry.getParameter(obj, 'scrub_path', 'rangeMin') !== undefined ? registry.getParameter(obj, 'scrub_path', 'rangeMin') : 0;
            const rangeMax = registry.getParameter(obj, 'scrub_path', 'rangeMax') !== undefined ? registry.getParameter(obj, 'scrub_path', 'rangeMax') : 1;
            const orient = registry.getParameter(obj, 'scrub_path', 'orient');
            const tension = pathObj.tension !== undefined ? pathObj.tension : 0.5;

            // 1. Get Target Input
            let targetInput = 0;
            if (mode === 'manual') {
                targetInput = registry.getParameter(obj, 'scrub_path', 'progress') || 0;
            } else if (mode === 'variable') {
                const varName = registry.getParameter(obj, 'scrub_path', 'targetVariable');
                targetInput = (runtime.variables && runtime.variables[varName] !== undefined) ? runtime.variables[varName] : 0;
            } else if (mode === 'scroll') {
                if (typeof window !== 'undefined') {
                    const scrollY = window.scrollY || document.documentElement.scrollTop;
                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    targetInput = maxScroll > 0 ? scrollY / maxScroll : 0;
                }
            }

            // Clamp and Map
            targetInput = Math.max(0, Math.min(1, targetInput));
            const mappedTarget = rangeMin + targetInput * (rangeMax - rangeMin);
            obj._scrubTarget = mappedTarget;

            // 2. Smoothing
            const lerpFactor = 1 - smoothing;
            obj._scrubCurrent += (obj._scrubTarget - obj._scrubCurrent) * lerpFactor;

            // 3. Update Position
            const pos = runtime.getSplinePoint(pathObj.points, tension, obj._scrubCurrent, pathObj.closed);
            obj.x = pos.x + (pathObj.x || 0);
            obj.y = pos.y + (pathObj.y || 0);

            // 4. Update Orientation
            if (orient) {
                const step = 0.005;
                const nextT = Math.min(1, obj._scrubCurrent + step);
                const prevT = Math.max(0, obj._scrubCurrent - step);
                const p1 = runtime.getSplinePoint(pathObj.points, tension, prevT, pathObj.closed);
                const p2 = runtime.getSplinePoint(pathObj.points, tension, nextT, pathObj.closed);
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
                obj.rotation = angle;
            }
        }
    });
}

// Tale Pop DOM Rendering System (Export Runtime)
function showTalePop(config) {
    let {
        message, title, position, animationType, duration,
        autoClose, closeDelay, showAvatar, avatarUrl, characterName,
        soundUrl, backgroundColor, textColor, fontSize,
        enableChoices, choices, runtime, typewriterSound,
        voiceUrl, avatarSvg, bubbleMode, targetObj
    } = config;

    // --- VARIABLE INJECTION ---
    const injectVars = (text) => {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/\{(\w+)\}/g, (match, varName) => {
            const val = runtime.getVariable(varName) ?? (window.OviTrackers?.[varName]);
            return val !== undefined ? val : match;
        });
    };
    message = injectVars(message);
    title = injectVars(title);
    characterName = injectVars(characterName);

    if (!document.getElementById('ovi-talepop-styles')) {
        const style = document.createElement('style');
        style.id = 'ovi-talepop-styles';
        style.textContent = `.ovi-talepop-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;pointer-events:auto}.ovi-talepop-overlay.position-top{align-items:flex-start;padding-top:50px}.ovi-talepop-overlay.position-bottom{align-items:flex-end;padding-bottom:50px}.ovi-talepop-box{max-width:500px;width:90%;padding:24px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5);font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;opacity:0;transform:scale(0.9)}.ovi-talepop-box.anim-fade{animation:taleFadeIn var(--duration) ease-out forwards}.ovi-talepop-box.anim-slide{animation:taleSlideIn var(--duration) ease-out forwards}.ovi-talepop-box.anim-bounce{animation:taleBounceIn var(--duration) cubic-bezier(0.68,-0.55,0.265,1.55) forwards}@keyframes taleFadeIn{to{opacity:1;transform:scale(1)}}@keyframes taleSlideIn{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:translateY(0)}}@keyframes taleBounceIn{0%{opacity:0;transform:scale(0.3)}50%{opacity:1;transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}.ovi-talepop-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}.ovi-talepop-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.2)}.ovi-talepop-character{font-weight:700;font-size:14px;opacity:0.8;text-transform:uppercase;letter-spacing:0.05em}.ovi-talepop-title{font-size:20px;font-weight:700;margin-bottom:12px}.ovi-talepop-message{line-height:1.6;margin-bottom:16px}.ovi-talepop-choices{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.ovi-talepop-choice-btn{flex:1;min-width:120px;padding:12px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;background:rgba(255,255,255,0.1);color:inherit}.ovi-talepop-choice-btn:hover{background:rgba(255,255,255,0.2);transform:translateY(-2px)}.ovi-talepop-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border:none;background:rgba(255,255,255,0.1);color:inherit;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;transition:background 0.2s}.ovi-talepop-close:hover{background:rgba(255,255,255,0.2)}`;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = `ovi-talepop-overlay position-${position}`;

    // --- BUBBLE MODE (ANCHORED) ---
    if (bubbleMode === 'anchored' && targetObj) {
        // Modify overlay to be pointer-events: none so clicks pass through outside bubble
        overlay.style.pointerEvents = 'none';
        overlay.style.background = 'transparent'; // No dark dimming for bubbles usually
    }

    const box = document.createElement('div');
    box.className = `ovi-talepop-box anim-${animationType}`;

    if (bubbleMode === 'anchored' && targetObj) {
        box.style.pointerEvents = 'auto'; // Re-enable clicks on bubble
        const ox = targetObj.x;
        // Assume canvas center is 0,0 relative to screen? No, export uses full window.
        // In export, objects are absolute.
        const oy = targetObj.y - (targetObj.height || 50) / 2 - 20;

        box.style.left = ox + 'px';
        box.style.top = oy + 'px';
        box.style.transform = 'translate(-50%, -100%)';
        box.style.position = 'absolute';
        box.style.margin = '0'; // Override default centering

        // Anchor Loop
        const anchorUpdate = setInterval(() => {
            if (!box.parentNode) { clearInterval(anchorUpdate); return; }
            // Update position if object moves
            box.style.left = targetObj.x + 'px';
            box.style.top = (targetObj.y - (targetObj.height || 50) / 2 - 20) + 'px';
        }, 30);
    }

    box.style.cssText += `background:${backgroundColor};color:${textColor};font-size:${fontSize}px;--duration:${duration}s;position:relative`;
    // Note: cssText overwrites, so we append or be careful. 
    // Actually the template uses cssText assignment. Let's start fresh for box to respect anchored.
    if (bubbleMode !== 'anchored') {
        box.style.cssText = `background:${backgroundColor};color:${textColor};font-size:${fontSize}px;--duration:${duration}s;position:relative`;
    } else {
        // Apply styling manually for anchored
        box.style.background = backgroundColor;
        box.style.color = textColor;
        box.style.fontSize = fontSize + 'px';
        box.style.setProperty('--duration', duration + 's');
        // Position set above
    }

    let html = '';
    if (showAvatar || characterName) {
        html += '<div class="ovi-talepop-header">';
        if (showAvatar && (avatarUrl || avatarSvg)) {
            if (avatarSvg) html += `<div class="ovi-talepop-avatar svg-mode">${avatarSvg}</div>`;
            else html += `<img src="${avatarUrl}" class="ovi-talepop-avatar" alt="Avatar">`;
        }
        if (characterName) html += `<div class="ovi-talepop-character">${characterName}</div>`;
        html += '</div>';
    }
    if (title) html += `<div class="ovi-talepop-title">${title}</div>`;
    html += animationType === 'typewriter' ? `<div class="ovi-talepop-message" data-typewriter="${message}"></div>` : `<div class="ovi-talepop-message">${message}</div>`;
    if (enableChoices && choices.length > 0) {
        html += '<div class="ovi-talepop-choices">';
        choices.forEach((choice, index) => { html += `<button class="ovi-talepop-choice-btn" data-choice-index="${index}">${choice.text || `Choice ${index + 1}`}</button>`; });
        html += '</div>';
    }
    html += '<button class="ovi-talepop-close">×</button>';

    box.innerHTML = html;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    if (soundUrl) {
        try { new Audio(soundUrl).play().catch(e => { }); } catch (e) { }
    }

    // --- VOICE & LIP SYNC ---
    if (voiceUrl) {
        try {
            const voice = new Audio(voiceUrl);
            voice.play().catch(e => { });

            // Lip Sync Animation
            if (showAvatar) {
                const avatarEl = box.querySelector('.ovi-talepop-avatar img, .ovi-talepop-avatar svg');
                if (avatarEl) {
                    const talkInterval = setInterval(() => {
                        if (voice.paused || voice.ended || !box.parentNode) {
                            clearInterval(talkInterval);
                            avatarEl.style.transform = 'scale(1)';
                            return;
                        }
                        // Random squash/stretch to simulate talking
                        const open = 1 + Math.random() * 0.15;
                        const squash = 1 - Math.random() * 0.05;
                        avatarEl.style.transform = `scaleY(${open}) scaleX(${squash})`;
                        avatarEl.style.transformOrigin = 'bottom center';
                        avatarEl.style.transition = 'transform 0.1s';
                    }, 100);
                }
            }
        } catch (e) { }
    }

    if (animationType === 'typewriter') {
        const messageEl = box.querySelector('.ovi-talepop-message');
        const text = messageEl.getAttribute('data-typewriter');
        messageEl.textContent = '';
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                messageEl.textContent += text[i];

                // Audio Beep
                if (typewriterSound !== false && i % 2 === 0 && runtime.getAudioContext) {
                    // Simple blip
                    try {
                        const ctx = runtime.getAudioContext();
                        if (ctx.state === 'running') {
                            const osc = ctx.createOscillator();
                            const g = ctx.createGain();
                            osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
                            g.gain.setValueAtTime(0.05, ctx.currentTime);
                            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                            osc.connect(g); g.connect(ctx.destination);
                            osc.start(); osc.stop(ctx.currentTime + 0.05);
                        }
                    } catch (e) { }
                }

                i++;
            } else { clearInterval(typeInterval); }
        }, 30); // Faster typing
    }

    const closePopup = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 300); };
    box.querySelector('.ovi-talepop-close').onclick = closePopup;
    overlay.onclick = (e) => { if (e.target === overlay) closePopup(); };

    if (enableChoices) {
        box.querySelectorAll('.ovi-talepop-choice-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.getAttribute('data-choice-index'));
                const choice = choices[index];
                if (choice && runtime) {
                    if (choice.actionId) runtime.emitAction(choice.actionId);

                    // --- ADVANCED CHOICE LOGIC ---
                    // Inject Variable on choice? e.g. "Take Sword" -> set inventory_sword = 1
                    if (choice.setVariable) {
                        try {
                            const [k, v] = choice.setVariable.split('=');
                            if (k && v) runtime.setVariable(k.trim(), v.trim());
                        } catch (e) { }
                    }

                    // Trigger Logic Event (so we can hook up random logic in Editor)
                    runtime.fireLogicEvent(runtime.getObject('global') || {}, 'choice_made', { text: choice.text, index });
                }
                closePopup();
            };
        });
    }

    if (autoClose) setTimeout(closePopup, closeDelay * 1000);
}

// Progress Tracker System (Export Runtime)
function updateTracker(config) {
    const { trackerId, amount, operation, maxValue, minValue, saveToStorage, showNotification, notificationText, notificationColor, playSound, soundUrl, particleEffect, particleColor, updateUI, uiElementId, obj, runtime } = config;
    if (!window.OviTrackers) window.OviTrackers = {};
    if (window.OviTrackers[trackerId] === undefined) {
        if (saveToStorage) {
            const saved = localStorage.getItem(`ovi_tracker_${trackerId}`);
            window.OviTrackers[trackerId] = saved ? parseFloat(saved) : 0;
        } else window.OviTrackers[trackerId] = 0;
    }
    const oldValue = window.OviTrackers[trackerId];
    let newValue = oldValue;
    if (operation === 'add') newValue = oldValue + amount;
    else if (operation === 'subtract') newValue = oldValue - amount;
    else if (operation === 'set') newValue = amount;
    newValue = Math.max(minValue, Math.min(maxValue, newValue));
    window.OviTrackers[trackerId] = newValue;
    if (saveToStorage) localStorage.setItem(`ovi_tracker_${trackerId}`, newValue.toString());
    if (showNotification) {
        const delta = newValue - oldValue;
        const text = notificationText || (delta >= 0 ? `+${delta}` : `${delta}`);
        showTrackerNotification(text, notificationColor, obj);
    }
    if (playSound && soundUrl) { try { new Audio(soundUrl).play().catch(e => { }); } catch (e) { } }
    if (particleEffect && obj) spawnTrackerParticles(obj, particleColor, runtime);
    if (updateUI && uiElementId) {
        const uiElement = document.getElementById(uiElementId);
        if (uiElement) {
            if (uiElement.tagName === 'PROGRESS' || uiElement.tagName === 'INPUT') uiElement.value = newValue;
            else uiElement.textContent = Math.round(newValue).toString();
        }
    }
}

function showTrackerNotification(text, color, obj) {
    if (!document.getElementById('ovi-tracker-styles')) {
        const style = document.createElement('style');
        style.id = 'ovi-tracker-styles';
        style.textContent = `.ovi-tracker-notification{position:fixed;font-size:24px;font-weight:700;pointer-events:none;z-index:9999;animation:trackerFloat 1.5s ease-out forwards;text-shadow:0 2px 4px rgba(0,0,0,0.5)}@keyframes trackerFloat{0%{opacity:1;transform:translateY(0) scale(0.8)}50%{opacity:1;transform:translateY(-40px) scale(1.2)}100%{opacity:0;transform:translateY(-80px) scale(1)}}`;
        document.head.appendChild(style);
    }
    const notification = document.createElement('div');
    notification.className = 'ovi-tracker-notification';
    notification.textContent = text;
    notification.style.color = color;
    if (obj && obj.x !== undefined && obj.y !== undefined) {
        notification.style.left = `${obj.x}px`;
        notification.style.top = `${obj.y}px`;
    } else {
        notification.style.left = '50%';
        notification.style.top = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
    }
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 1500);
}

function spawnTrackerParticles(obj, color, runtime) {
    if (!runtime || !runtime.particles) return;
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const speed = 2 + Math.random() * 3;
        runtime.particles.push({
            x: obj.x || 0,
            y: obj.y || 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            size: 4 + Math.random() * 4,
            color: color,
            gravity: 0.1
        });
    }
}

// --- Tooltip System ---
function showTooltip(obj, text, runtime) {
    if (obj._tooltipEl) {
        // Update
        if (obj._tooltipEl.innerText !== text) obj._tooltipEl.innerText = text;

        let rect;
        // Handle runtime context (editor vs export)
        if (runtime.canvas) {
            rect = runtime.canvas.getBoundingClientRect();
        } else {
            // Fallback if no canvas ref
            rect = { left: 0, top: 0 };
        }

        obj._tooltipEl.style.left = (rect.left + obj.x) + 'px';
        obj._tooltipEl.style.top = (rect.top + obj.y - (obj.height || 30) / 2 - 10) + 'px';
        return;
    }
    const el = document.createElement('div');
    el.className = 'ovi-tooltip';
    el.innerText = text;
    el.style.cssText = `
        position: absolute;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 14px;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-50%, -100%);
        white-space: nowrap;
        font-family: 'Segoe UI', sans-serif;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(el);
    obj._tooltipEl = el;
}

function hideTooltip(obj) {
    if (obj._tooltipEl) {
        obj._tooltipEl.remove();
        delete obj._tooltipEl;
    }
}


