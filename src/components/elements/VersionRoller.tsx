import { Component, type CSSProperties, type ReactNode } from 'react';

import { RollDirection } from './enums/RollDirection';
import type { RollingSemVer } from './RollingSemVer';
import type { RollingValue } from './RollingValue';
import type { SemVerParts } from './SemVerParts';


export interface VersionRollerProps {
    startVersion: string;
    endVersion: string;
    progress: number;  // Range [0, 1]. 0 shows startVersion, 1 shows endVersion.
}


class VersionRoller extends Component<VersionRollerProps> {
    private readonly _DIGIT_HEIGHT: number = 14;

    public render(): ReactNode {
        const { startVersion, endVersion, progress }: VersionRollerProps = this.props;
        const startParts: SemVerParts = this._parseSemVer(startVersion);
        const endParts: SemVerParts = this._parseSemVer(endVersion);
        const normalizedProgress: number = this._clampProgress(progress);
        const rollingSemVer: RollingSemVer = this._resolveRollingSemVer(startParts, endParts, normalizedProgress);

        return (
            <div data-testid="node-version-roller" style={this._getContainerStyle()}>
                {this._renderRollingValue(rollingSemVer.major)}
                <span style={this._getSeparatorStyle()}>.</span>
                {this._renderRollingValue(rollingSemVer.minor)}
                <span style={this._getSeparatorStyle()}>.</span>
                {this._renderRollingValue(rollingSemVer.patch)}
            </div>
        );
    }

    private _parseSemVer(version: string): SemVerParts {
        const cleanVersion: string = version.replace(/^v/, '');
        const versionSegments: string[] = cleanVersion.split('.');

        return {
            major: parseInt(versionSegments[0], 10) || 0,
            minor: parseInt(versionSegments[1], 10) || 0,
            patch: parseInt(versionSegments[2], 10) || 0
        };
    }

    private _clampProgress(progress: number): number {
        if (progress < 0) {
            return 0;
        }

        if (progress > 1) {
            return 1;
        }

        return progress;
    }

    private _resolveRollingSemVer(start: SemVerParts, end: SemVerParts, progress: number): RollingSemVer {
        const rollingMajor: RollingValue = this._createStationaryValue(start.major);
        const rollingMinor: RollingValue = this._createStationaryValue(start.minor);
        const rollingPatch: RollingValue = this._createStationaryValue(start.patch);

        if (end.major > start.major) {
            return this._resolveMajorUpgradeRolling(start, end, progress, rollingMajor, rollingMinor, rollingPatch);
        }

        if (end.major === start.major && end.minor > start.minor) {
            return this._resolveMinorUpgradeRolling(start, end, progress, rollingMajor, rollingMinor, rollingPatch);
        }

        return {
            major: this._interpolateRollingValue(start.major, end.major, progress),
            minor: this._interpolateRollingValue(start.minor, end.minor, progress),
            patch: this._interpolateRollingValue(start.patch, end.patch, progress)
        };
    }

    private _resolveMajorUpgradeRolling(
        start: SemVerParts,
        end: SemVerParts,
        progress: number,
        rollingMajor: RollingValue,
        rollingMinor: RollingValue,
        rollingPatch: RollingValue
    ): RollingSemVer {
        const patchResetEndProgress: number = 0.34;
        const minorResetEndProgress: number = 0.67;
        const patchResetProgress: number = this._normalizeRange(progress, 0, patchResetEndProgress);
        const minorResetProgress: number = this._normalizeRange(progress, patchResetEndProgress, minorResetEndProgress);
        const majorRiseProgress: number = this._normalizeRange(progress, minorResetEndProgress, 1);

        rollingPatch.value = this._interpolateNumericValue(start.patch, 0, patchResetProgress);
        rollingPatch.direction = start.patch === 0 ? RollDirection.NONE : RollDirection.UP;
        rollingPatch.segmentStart = start.patch;
        rollingPatch.segmentEnd = 0;

        rollingMinor.value = this._interpolateNumericValue(start.minor, 0, minorResetProgress);
        rollingMinor.direction = start.minor === 0 ? RollDirection.NONE : RollDirection.UP;
        rollingMinor.segmentStart = start.minor;
        rollingMinor.segmentEnd = 0;

        rollingMajor.value = this._interpolateNumericValue(start.major, end.major, majorRiseProgress);
        rollingMajor.direction = this._resolveDirection(start.major, end.major);
        rollingMajor.segmentStart = start.major;
        rollingMajor.segmentEnd = end.major;

        if (progress >= minorResetEndProgress && end.minor !== 0) {
            rollingMinor.value = this._interpolateNumericValue(0, end.minor, majorRiseProgress);
            rollingMinor.direction = this._resolveDirection(0, end.minor);
            rollingMinor.segmentStart = 0;
            rollingMinor.segmentEnd = end.minor;
        }

        if (progress >= minorResetEndProgress && end.patch !== 0) {
            rollingPatch.value = this._interpolateNumericValue(0, end.patch, majorRiseProgress);
            rollingPatch.direction = this._resolveDirection(0, end.patch);
            rollingPatch.segmentStart = 0;
            rollingPatch.segmentEnd = end.patch;
        }

        return {
            major: rollingMajor,
            minor: rollingMinor,
            patch: rollingPatch
        };
    }

    private _resolveMinorUpgradeRolling(
        start: SemVerParts,
        end: SemVerParts,
        progress: number,
        rollingMajor: RollingValue,
        rollingMinor: RollingValue,
        rollingPatch: RollingValue
    ): RollingSemVer {
        const patchResetEndProgress: number = 0.5;
        const patchResetProgress: number = this._normalizeRange(progress, 0, patchResetEndProgress);
        const minorRiseProgress: number = this._normalizeRange(progress, patchResetEndProgress, 1);

        rollingPatch.value = this._interpolateNumericValue(start.patch, 0, patchResetProgress);
        rollingPatch.direction = start.patch === 0 ? RollDirection.NONE : RollDirection.UP;
        rollingPatch.segmentStart = start.patch;
        rollingPatch.segmentEnd = 0;

        rollingMinor.value = this._interpolateNumericValue(start.minor, end.minor, minorRiseProgress);
        rollingMinor.direction = this._resolveDirection(start.minor, end.minor);
        rollingMinor.segmentStart = start.minor;
        rollingMinor.segmentEnd = end.minor;

        if (progress >= patchResetEndProgress && end.patch !== 0) {
            rollingPatch.value = this._interpolateNumericValue(0, end.patch, minorRiseProgress);
            rollingPatch.direction = this._resolveDirection(0, end.patch);
            rollingPatch.segmentStart = 0;
            rollingPatch.segmentEnd = end.patch;
        }

        return {
            major: rollingMajor,
            minor: rollingMinor,
            patch: rollingPatch
        };
    }

    private _normalizeRange(value: number, start: number, end: number): number {
        if (end <= start) {
            return 0;
        }

        const normalizedValue: number = (value - start) / (end - start);
        return this._clampProgress(normalizedValue);
    }

    private _createStationaryValue(value: number): RollingValue {
        return {
            value,
            direction: RollDirection.NONE,
            segmentStart: value,
            segmentEnd: value
        };
    }

    private _interpolateRollingValue(startValue: number, endValue: number, progress: number): RollingValue {
        return {
            value: this._interpolateNumericValue(startValue, endValue, progress),
            direction: this._resolveDirection(startValue, endValue),
            segmentStart: startValue,
            segmentEnd: endValue
        };
    }

    private _interpolateNumericValue(startValue: number, endValue: number, progress: number): number {
        return startValue + (endValue - startValue) * progress;
    }

    private _resolveDirection(startValue: number, endValue: number): RollDirection {
        if (endValue > startValue) {
            return RollDirection.UP;
        }

        if (endValue < startValue) {
            return RollDirection.DOWN;
        }

        return RollDirection.NONE;
    }

    private _renderRollingValue(rollingValue: RollingValue): ReactNode {
        if (
            rollingValue.direction === RollDirection.NONE ||
            Math.round(rollingValue.segmentStart) === Math.round(rollingValue.segmentEnd)
        ) {
            const roundedValue: number = Math.round(rollingValue.value);

            return (
                <div style={this._getDigitContainerStyle()}>
                    <span style={this._getDigitStyle()}>{roundedValue}</span>
                </div>
            );
        }

        if (rollingValue.direction === RollDirection.UP) {
            return this._renderTopToBottomTrack(rollingValue);
        }

        return this._renderBottomToTopTrack(rollingValue);
    }

    private _renderTopToBottomTrack(rollingValue: RollingValue): ReactNode {
        const numberSequence: number[] = this._buildInclusiveNumberSequence(
            Math.round(rollingValue.segmentEnd),
            Math.round(rollingValue.segmentStart)
        );

        const startIndex: number = numberSequence.length - 1;

        const segmentProgress: number = this._resolveSegmentProgress(
            rollingValue.value,
            rollingValue.segmentStart,
            rollingValue.segmentEnd
        );

        const translateStart: number = -startIndex * this._DIGIT_HEIGHT;
        const translateEnd: number = 0;
        const translateY: number = this._interpolateNumericValue(translateStart, translateEnd, segmentProgress);

        return this._renderTrack(numberSequence, translateY);
    }

    private _renderBottomToTopTrack(rollingValue: RollingValue): ReactNode {
        const numberSequence: number[] = this._buildInclusiveNumberSequence(
            Math.round(rollingValue.segmentStart),
            Math.round(rollingValue.segmentEnd)
        );

        const endIndex: number = numberSequence.length - 1;

        const segmentProgress: number = this._resolveSegmentProgress(
            rollingValue.value,
            rollingValue.segmentStart,
            rollingValue.segmentEnd
        );

        const translateStart: number = 0;
        const translateEnd: number = -endIndex * this._DIGIT_HEIGHT;
        const translateY: number = this._interpolateNumericValue(translateStart, translateEnd, segmentProgress);

        return this._renderTrack(numberSequence, translateY);
    }

    private _renderTrack(numberSequence: number[], translateY: number): ReactNode {
        return (
            <div style={this._getDigitContainerStyle()}>
                <div
                    style={{
                        ...this._getDigitScrollStyle(),
                        transform: `translateY(${translateY}px)`
                    }}
                >
                    {numberSequence.map((value: number, index: number): ReactNode => (
                        <span key={`${value}-${index}`} style={this._getDigitStyle()}>
                            {value}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    private _buildInclusiveNumberSequence(start: number, end: number): number[] {
        if (start === end) {
            return [start];
        }

        const numberSequence: number[] = [];
        const step: number = end > start ? 1 : -1;

        for (let value: number = start; step > 0 ? value <= end : value >= end; value += step) {
            numberSequence.push(value);
        }

        return numberSequence;
    }

    private _resolveSegmentProgress(currentValue: number, segmentStart: number, segmentEnd: number): number {
        if (segmentStart === segmentEnd) {
            return 0;
        }

        if (segmentEnd > segmentStart) {
            return this._clampProgress((currentValue - segmentStart) / (segmentEnd - segmentStart));
        }

        return this._clampProgress((segmentStart - currentValue) / (segmentStart - segmentEnd));
    }

    private _getContainerStyle(): CSSProperties {
        return {
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'monospace',
            fontSize: '9pt',
            color: '#666666',
            whiteSpace: 'nowrap',
            overflow: 'hidden'
        };
    }

    private _getSeparatorStyle(): CSSProperties {
        return {
            display: 'inline-block',
            width: '4px',
            textAlign: 'center'
        };
    }

    private _getDigitContainerStyle(): CSSProperties {
        return {
            display: 'inline-block',
            height: `${this._DIGIT_HEIGHT}px`,
            overflow: 'hidden',
            position: 'relative',
            minWidth: '8px',
            textAlign: 'center'
        };
    }

    private _getDigitScrollStyle(): CSSProperties {
        return {
            display: 'flex',
            flexDirection: 'column',
            transition: 'none'
        };
    }

    private _getDigitStyle(): CSSProperties {
        return {
            display: 'block',
            height: `${this._DIGIT_HEIGHT}px`,
            lineHeight: `${this._DIGIT_HEIGHT}px`
        };
    }
}


export default VersionRoller;
