import type { TimelineSlider } from './TimelineSlider';


export class TimelineKeyboardController {
    private _timelineSliderRef: TimelineSlider | null = null;
    private _isBound: boolean = false;

    // Animation state for movement.
    private _animationFrameId: number | null = null;
    private _lastFrameTime: number = 0;
    private _targetPosition: number | null = null;
    private _isHolding: boolean = false;
    private _holdDirection: 'left' | 'right' | null = null;
    private _pressedDirection: 'left' | 'right' | null = null;
    private _holdActivationTimerId: number | null = null;
    private _upDownReboundTimerId: number | null = null;

    // Movement constants.
    private readonly _ANIMATION_SPEED: number = 3.0;  // Units per second for single press animation.
    private readonly _HOLD_SPEED: number = 2.0;  // Units per second when holding.
    private readonly _INSTANT_JUMP_SIZE: number = 1;
    private readonly _HOLD_ACTIVATION_DELAY_MS: number = 120;
    private readonly _UP_DOWN_REBOUND_DELAY_MS: number = 2000;
    private readonly _UP_DOWN_SNAP_DURATION_MS: number = 650;
    private readonly _UP_DOWN_COLLAPSE_DURATION_MS: number = 700;

    private _handleKeyDown: (event: KeyboardEvent) => void = (event: KeyboardEvent): void => {
        if (!this._timelineSliderRef) {
            return;
        }

        const key: string = event.key;

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            event.preventDefault();
            this._clearUpDownReboundTimer();
            this._timelineSliderRef.setKeyboardBoundaryReboundSoftMode(false);

            const direction: 'left' | 'right' = key === 'ArrowLeft' ? 'left' : 'right';

            if (event.repeat) {
                return;
            }

            this._pressedDirection = direction;
            this._stopAnimation(false);
            this._startSingleStepAnimation(direction);
            this._scheduleHoldActivation(direction);
        } else if (key === 'ArrowUp' || key === 'ArrowDown') {
            event.preventDefault();

            if (!event.repeat) {
                // Instant jump. Up moves left, down moves right.
                this._stopAnimation(false);
                this._timelineSliderRef.setKeyboardActive(true, 200);
                this._timelineSliderRef.setKeyboardBoundaryReboundSoftMode(true);
                const delta: number = key === 'ArrowUp' ? -this._INSTANT_JUMP_SIZE : this._INSTANT_JUMP_SIZE;
                this._timelineSliderRef.jumpTo(delta, true);
                this._scheduleUpDownBoundaryRebound();
            }
        }
    };

    private _handleKeyUp: (event: KeyboardEvent) => void = (event: KeyboardEvent): void => {
        const key: string = event.key;

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            const direction: 'left' | 'right' = key === 'ArrowLeft' ? 'left' : 'right';

            if (this._pressedDirection !== direction) {
                return;
            }

            this._pressedDirection = null;
            this._clearHoldActivationTimer();

            if (this._isHolding) {
                this._stopAnimation();
                return;
            }

            if (this._targetPosition === null && this._timelineSliderRef) {
                this._timelineSliderRef.setKeyboardActive(false);
            }
        }
    };

    private _animationLoop: () => void = (): void => {
        if (!this._timelineSliderRef) {
            return;
        }

        const currentTime: number = performance.now();
        const deltaTime: number = (currentTime - this._lastFrameTime) / 1000;
        this._lastFrameTime = currentTime;

        if (this._isHolding && this._holdDirection !== null) {
            // Continuous hold movement.
            const delta: number = this._holdDirection === 'left'
                ? -this._HOLD_SPEED * deltaTime
                : this._HOLD_SPEED * deltaTime;

            this._timelineSliderRef.moveContinuous(delta);
            this._animationFrameId = requestAnimationFrame(this._animationLoop);
        } else if (this._targetPosition !== null) {
            // Single step animation toward target.
            const currentPosition: number = this._timelineSliderRef.getCurrentPosition();
            const distance: number = this._targetPosition - currentPosition;
            const maxMove: number = this._ANIMATION_SPEED * deltaTime;

            if (Math.abs(distance) <= maxMove) {
                // Reached target.
                this._timelineSliderRef.moveContinuous(distance);
                this._targetPosition = null;
                this._animationFrameId = null;

                if (this._pressedDirection === null) {
                    this._timelineSliderRef.setKeyboardActive(false);
                }
            } else {
                // Move toward target.
                const delta: number = distance > 0 ? maxMove : -maxMove;
                this._timelineSliderRef.moveContinuous(delta);
                this._animationFrameId = requestAnimationFrame(this._animationLoop);
            }
        }
    };

    private _startSingleStepAnimation(direction: 'left' | 'right'): void {
        if (!this._timelineSliderRef) {
            return;
        }

        // Activate keyboard expansion.
        this._timelineSliderRef.setKeyboardActive(true);

        const currentPosition: number = this._timelineSliderRef.getCurrentPosition();
        const maxPosition: number = this._timelineSliderRef.getMaxPosition();

        // Round to nearest 0.5 tick.
        const currentTick: number = Math.round(currentPosition * 2) / 2;

        // Calculate target as the next 0.5 tick in the given direction.
        if (direction === 'left') {
            this._targetPosition = currentTick <= currentPosition ? currentTick - 0.5 : currentTick;
        } else {
            this._targetPosition = currentTick >= currentPosition ? currentTick + 0.5 : currentTick;
        }

        // Clamp to valid range.
        this._targetPosition = Math.max(0, Math.min(this._targetPosition, maxPosition));

        this._isHolding = false;
        this._holdDirection = null;
        this._lastFrameTime = performance.now();
        this._animationLoop();
    }

    private _startHoldMovement(direction: 'left' | 'right'): void {
        if (!this._timelineSliderRef) {
            return;
        }

        // Activate keyboard expansion.
        this._timelineSliderRef.setKeyboardActive(true);

        this._isHolding = true;
        this._holdDirection = direction;
        this._targetPosition = null;
        this._lastFrameTime = performance.now();
        this._animationLoop();
    }

    private _scheduleHoldActivation(direction: 'left' | 'right'): void {
        this._clearHoldActivationTimer();

        this._holdActivationTimerId = window.setTimeout((): void => {
            if (!this._timelineSliderRef) {
                return;
            }

            if (this._pressedDirection !== direction || this._isHolding) {
                return;
            }

            this._stopAnimation(false);
            this._startHoldMovement(direction);
        }, this._HOLD_ACTIVATION_DELAY_MS);
    }

    private _clearHoldActivationTimer(): void {
        if (this._holdActivationTimerId !== null) {
            window.clearTimeout(this._holdActivationTimerId);
            this._holdActivationTimerId = null;
        }
    }

    private _scheduleUpDownBoundaryRebound(): void {
        this._clearUpDownReboundTimer(false);

        this._upDownReboundTimerId = window.setTimeout((): void => {
            if (!this._timelineSliderRef) {
                return;
            }

            this._timelineSliderRef.snapToNearestTick({
                durationMilliseconds: this._UP_DOWN_SNAP_DURATION_MS,
                keepKeyboardExpanded: true,
                onComplete: (): void => {
                    if (!this._timelineSliderRef) {
                        return;
                    }

                    this._timelineSliderRef.startKeyboardSynchronizedCollapse(this._UP_DOWN_COLLAPSE_DURATION_MS);
                    this._timelineSliderRef.setKeyboardBoundaryReboundSoftMode(false);
                }
            });
            this._upDownReboundTimerId = null;
        }, this._UP_DOWN_REBOUND_DELAY_MS);
    }

    private _clearUpDownReboundTimer(shouldCollapse: boolean = false): void {
        if (this._upDownReboundTimerId !== null) {
            window.clearTimeout(this._upDownReboundTimerId);
            this._upDownReboundTimerId = null;
        }

        if (shouldCollapse && this._timelineSliderRef) {
            this._timelineSliderRef.startKeyboardSynchronizedCollapse(this._UP_DOWN_COLLAPSE_DURATION_MS);
            this._timelineSliderRef.setKeyboardBoundaryReboundSoftMode(false);
        }
    }

    private _stopAnimation(shouldSnap: boolean = true): void {
        this._clearHoldActivationTimer();
        this._isHolding = false;
        this._holdDirection = null;
        this._targetPosition = null;

        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }

        // Clear boundary feedback and snap to nearest tick when stopping.
        if (shouldSnap && this._timelineSliderRef) {
            this._timelineSliderRef.snapToNearestTick();
        }
    }

    public setTimelineSlider(slider: TimelineSlider | null): void {
        this._timelineSliderRef = slider;
    }

    public bind(target: Window): void {
        if (this._isBound) {
            return;
        }

        target.addEventListener('keydown', this._handleKeyDown);
        target.addEventListener('keyup', this._handleKeyUp);
        this._isBound = true;
    }

    public unbind(target: Window): void {
        if (!this._isBound) {
            return;
        }

        this._pressedDirection = null;
        this._clearUpDownReboundTimer(true);
        this._stopAnimation();
        target.removeEventListener('keydown', this._handleKeyDown);
        target.removeEventListener('keyup', this._handleKeyUp);
        this._isBound = false;
    }
}
