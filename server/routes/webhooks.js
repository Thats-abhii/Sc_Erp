import { Router } from "express";
import { upsertImportedLead } from "../services/leadImport.js";

export const webhooksRouter = Router();

function verifyWebhook(req, res, next) {
  const expected = process.env.WEBHOOK_SHARED_SECRET;
  if (expected && req.headers["x-smartcovering-secret"] !== expected) {
    return res.status(401).json({ error: "Invalid webhook secret" });
  }
  next();
}

webhooksRouter.post("/google-ads", verifyWebhook, async (req, res, next) => {
  try {
    res.status(201).json(await upsertImportedLead(req.body, "Google Ads"));
  } catch (error) {
    next(error);
  }
});

webhooksRouter.post("/justdial", verifyWebhook, async (req, res, next) => {
  try {
    res.status(201).json(await upsertImportedLead(req.body, "JustDial"));
  } catch (error) {
    next(error);
  }
});
