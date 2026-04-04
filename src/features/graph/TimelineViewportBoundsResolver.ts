import { type BlueprintPrerenderCombResult } from './BlueprintPrerenderCombResult';
import { type ContentBounds } from './ContentBounds';


export class TimelineViewportBoundsResolver {
    public static resolve(layoutResult: BlueprintPrerenderCombResult, timelineRawPosition: number): ContentBounds {
        const { contentBounds, contentBoundsFrames, frames }: BlueprintPrerenderCombResult = layoutResult;

        if (contentBoundsFrames && contentBoundsFrames.size > 0 && frames && frames.size > 0) {
            const startIndex: number = Math.floor(timelineRawPosition);
            const endIndex: number = Math.ceil(timelineRawPosition);
            const progress: number = timelineRawPosition - startIndex;

            const startBounds: ContentBounds | undefined = contentBoundsFrames.get(startIndex);
            const endBounds: ContentBounds | undefined = contentBoundsFrames.get(endIndex);

            if (startBounds && endBounds) {
                return {
                    minimumX: startBounds.minimumX + (endBounds.minimumX - startBounds.minimumX) * progress,
                    minimumY: startBounds.minimumY + (endBounds.minimumY - startBounds.minimumY) * progress,
                    maximumX: startBounds.maximumX + (endBounds.maximumX - startBounds.maximumX) * progress,
                    maximumY: startBounds.maximumY + (endBounds.maximumY - startBounds.maximumY) * progress
                };
            }
        }

        return contentBounds;
    }
}
