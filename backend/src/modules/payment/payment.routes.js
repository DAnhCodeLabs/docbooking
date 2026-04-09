import express from "express";
import * as paymentController from "./payment.controller.js";

const router = express.Router();

// IPN endpoint (public)
router.post("/vnpay-ipn", paymentController.vnpayIpn);
router.get("/confirm", paymentController.confirmPayment);
export default router;
