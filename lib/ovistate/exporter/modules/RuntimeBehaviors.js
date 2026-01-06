
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
                else if (actMode === 'on_hover') shouldRun = obj.isHovered;
                else if (actMode === 'on_click') {
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
            const radius = reg.getParameter(obj, 'orbit', 'radius') || 100;
            const cx = reg.getParameter(obj, 'orbit', 'centerX') || 400;
            const cy = reg.getParameter(obj, 'orbit', 'centerY') || 300;
            obj._oA += dt * speed;
            obj.x = cx + Math.cos(obj._oA) * radius;
            obj.y = cy + Math.sin(obj._oA) * radius;
        }
    });
    registry.register('scroller', {
        init(obj) { if (!obj._scrollerOrigin) obj._scrollerOrigin = { x: obj.x, y: obj.y }; },
        update(obj, dt, rt, reg) {
            if (!obj._scrollerOrigin) this.init(obj);
            const speedX = reg.getParameter(obj, 'scroller', 'speedX');
            const speedY = reg.getParameter(obj, 'scroller', 'speedY');
            const resetDist = reg.getParameter(obj, 'scroller', 'resetDistance');
            const axis = reg.getParameter(obj, 'scroller', 'axis');
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
            const lastAction = rt.lastAction; const s1ID = reg.getParameter(obj, 'state_switcher', 'state1ID'); const s2ID = reg.getParameter(obj, 'state_switcher', 'state2ID'); const target = reg.getParameter(obj, 'state_switcher', 'targetBehavior');
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
}

function registerTransform(registry) {
    registry.register('rotate_continuous', {
        init(obj) { if (obj.rotation === undefined) obj.rotation = 0; },
        update(obj, dt, rt, reg) {
            const s = reg.getParameter(obj, 'rotate_continuous', 'speed') || 2; const cw = reg.getParameter(obj, 'rotate_continuous', 'clockwise') !== false;
            obj.rotation += (cw ? 1 : -1) * s * dt;
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
    registry.register('click_response', {
        init(obj) { if (obj._crA === undefined) { obj._crA = false; obj._crT = 0; } },
        update(obj, dt, rt, reg) {
            if (obj._crA === undefined) this.init(obj); obj._crT += dt; const intensity = reg.getParameter(obj, 'click_response', 'intensity') || 5; const action = reg.getParameter(obj, 'click_response', 'action') || 'bounce';
            if (action === 'bounce') obj.y -= Math.sin(obj._crT * 10) * intensity; else if (action === 'grow') { const s = 1 + Math.sin(obj._crT * 5) * 0.2; if (obj.type === 'circle') obj.radius = (obj._sbOR || 30) * s; }
            if (obj._crT > 1) { obj._crT = 0; }
        }
    });
    registry.register('hover_grow', {
        init(obj) { if (!obj._oR) obj._oR = obj.radius || 30; if (!obj._hS) obj._hS = 1; },
        update(obj, dt, rt, reg) {
            if (!obj._oR) this.init(obj); const mx = rt.mouseX || -999, my = rt.mouseY || -999; const dist = Math.sqrt((mx - obj.x) ** 2 + (my - obj.y) ** 2); const isHover = dist < (obj.radius || 30); const target = isHover ? (reg.getParameter(obj, 'hover_grow', 'scale') || 1.5) : 1; obj._hS += (target - obj._hS) * 5 * dt; if (obj.type === 'circle') obj.radius = obj._oR * obj._hS;
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
    registry.register('follow_mouse_smooth', {
        update(obj, dt, rt, reg) { if (!rt.mouseX) return; const s = reg.getParameter(obj, 'follow_mouse_smooth', 'speed') || 1; const smooth = reg.getParameter(obj, 'follow_mouse_smooth', 'smoothness') || 0.2; const dx = rt.mouseX - obj.x; const dy = rt.mouseY - obj.y; const lerpFactor = Math.min(smooth * s * dt, 1.0); obj.x += dx * lerpFactor; obj.y += dy * lerpFactor; }
    });
    registry.register('look_at', {
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return; const speed = reg.getParameter(obj, 'look_at', 'speed') || 10; const offset = reg.getParameter(obj, 'look_at', 'offset') || 0; const dx = rt.mouseX - obj.x; const dy = rt.mouseY - obj.y; const targetAngle = Math.atan2(dy, dx) + (offset * Math.PI / 180);
            let currentAngle = obj.rotation || 0; let diff = targetAngle - currentAngle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; obj.rotation = currentAngle + diff * speed * dt;
        }
    });
    registry.register('spring_follow', {
        init(obj) { if (!obj._springVel) obj._springVel = { x: 0, y: 0 }; },
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return; if (!obj._springVel) this.init(obj); const stiffness = reg.getParameter(obj, 'spring_follow', 'stiffness') || 5; const damping = reg.getParameter(obj, 'spring_follow', 'damping') || 0.8; const dx = rt.mouseX - obj.x; const dy = rt.mouseY - obj.y; obj._springVel.x += (dx * stiffness) * dt; obj._springVel.y += (dy * stiffness) * dt; obj._springVel.x *= Math.pow(damping, dt * 60); obj._springVel.y *= Math.pow(damping, dt * 60); obj.x += obj._springVel.x * dt; obj.y += obj._springVel.y * dt;
        }
    });
    registry.register('draggable', {
        init(obj) { obj._dragVel = { x: 0, y: 0 }; },
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return;
            if (obj.isHovered && rt.isMouseDown && !obj._isDragging && !rt._draggingObj) { obj._isDragging = true; rt._draggingObj = obj; }
            if (!rt.isMouseDown && obj._isDragging) { obj._isDragging = false; if (rt._draggingObj === obj) rt._draggingObj = null; const throwPhy = reg.getParameter(obj, 'draggable', 'throwPhysics') === undefined ? true : reg.getParameter(obj, 'draggable', 'throwPhysics'); if (throwPhy && obj.physics) { obj.physics.velocity.x = obj._dragVel.x || 0; obj.physics.velocity.y = obj._dragVel.y || 0; obj.physics.enabled = true; } }
            if (obj._isDragging) { if (obj.physics) obj.physics.enabled = false; const vx = (rt.mouseX - obj.x) / dt; const vy = (rt.mouseY - obj.y) / dt; obj._dragVel.x = (obj._dragVel.x || 0) * 0.5 + vx * 0.5; obj._dragVel.y = (obj._dragVel.y || 0) * 0.5 + vy * 0.5; obj.x = rt.mouseX; obj.y = rt.mouseY; }
        }
    });
    registry.register('parallax', {
        init(obj) { if (!obj._paraBase) obj._paraBase = { x: obj.x, y: obj.y }; },
        update(obj, dt, rt, reg) { if (!rt.mouseX) return; if (!obj._paraBase) this.init(obj); const depth = reg.getParameter(obj, 'parallax', 'depth') || 10; const cx = rt.width / 2; const cy = rt.height / 2; const mx = (rt.mouseX - cx) / cx; const my = (rt.mouseY - cy) / cy; const tx = obj._paraBase.x + (mx * depth * -1); const ty = obj._paraBase.y + (my * depth * -1); obj.x += (tx - obj.x) * 5 * dt; obj.y += (ty - obj.y) * 5 * dt; }
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
        update(obj, dt, rt, reg) {
            if (obj.type !== 'timer') return; if (obj._wasRunning === undefined) obj._wasRunning = obj.isRunning; if (obj._wasRunning && !obj.isRunning && obj.currentTime <= 0) { const action = reg.getParameter(obj, 'timer_events', 'onFinishAction'); const emitId = reg.getParameter(obj, 'timer_events', 'emitActionId'); if (action && action !== 'none') { if (rt.ui && rt.ui.triggerAction) rt.ui.triggerAction(action, obj, emitId); } } obj._wasRunning = obj.isRunning;
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