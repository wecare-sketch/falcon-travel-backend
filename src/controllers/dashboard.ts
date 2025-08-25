import { Response } from "express";
import { errorHandler } from "../utils/errorHandler";
import { AuthenticatedRequest } from "../types/request";
import dashboardService from "../services/dashboard";

export const getKpis = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { from, to } = req.query;
    const result = await dashboardService.getKpis({
      from: from as string | undefined,
      to: to as string | undefined,
    });
    return res.json(result);
  }
);

export const getUpcoming = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const limit = Number(req.query.limit) || 5;
    const result = await dashboardService.getUpcomingEvents({ limit });
    return res.json(result);
  }
);

export const getPaymentStatus = errorHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    const result = await dashboardService.getPaymentStatus();
    return res.json(result);
  }
);

export const getMonthlyTargets = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const months = Number(req.query.months) || 6;
    const { from, to } = req.query;
    const result = await dashboardService.getMonthlyTargets({
      months,
      from: from as string | undefined,
      to: to as string | undefined,
    });
    return res.json(result);
  }
);

export const getRecentActivities = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const limit = Number(req.query.limit) || 10;
    const result = await dashboardService.getRecentActivities({ limit });
    return res.json(result);
  }
);

export const getDashboardTotal = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const limit = Number(req.query.limit) || 10;
    const months = Number(req.query.months) || 6;
    const { from, to } = req.query;

    const result = await dashboardService.getDashboard({
      from: from as string | undefined,
      to: to as string | undefined,
      limit,
      months,
    });

    return res.json(result);
  }
);
