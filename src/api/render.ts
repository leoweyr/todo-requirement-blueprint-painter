// SSR entry point for Vercel Serverless Functions.
// This file is bundled by esbuild into api/render.js.

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { RenderController } from './controllers/RenderController';


export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    const controller: RenderController = new RenderController();

    await controller.handle(req, res);
}
