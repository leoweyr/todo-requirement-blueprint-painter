import type { VercelRequest, VercelResponse } from '@vercel/node';

import { RenderController } from '../src/api/controllers/RenderController';


export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    const controller: RenderController = new RenderController();

    await controller.handle(req, res);
}
