import { AppDataSource } from "../config/db";
import { Event } from "../entities/event";
import { Transaction } from "../entities/transactions";
import { Notification } from "../entities/notifications";
import { EventStatus, PaymentStatus } from "../constants/enums";

const EventRepository = AppDataSource.getRepository(Event);
const TransactionRepository = AppDataSource.getRepository(Transaction);
const NotificationRepository = AppDataSource.getRepository(Notification);

const dashboardService = {
  getKpis: async ({ from, to }: { from?: string; to?: string }) => {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const startDate = from ? new Date(from) : defaultStart;
    const endDate = to ? new Date(to) : defaultEnd;

    const [activeEvents, pendingEvents] = await Promise.all([
      EventRepository.createQueryBuilder("event")
        .where("event.eventStatus IN (:...statuses)", {
          statuses: [EventStatus.CREATED, EventStatus.STARTED],
        })
        .getCount(),
      EventRepository.count({ where: { eventStatus: EventStatus.PENDING } }),
    ]);

    const revenueRow = await TransactionRepository.createQueryBuilder(
      "transaction"
    )
      .select("COALESCE(SUM(transaction.amountReceived), 0)", "total")
      .where("transaction.status = :paid", { paid: PaymentStatus.PAID })
      .andWhere("transaction.paidAt >= :startDate", { startDate })
      .andWhere("transaction.paidAt < :endDate", { endDate })
      .getRawOne<{ total: string }>();

    const outstandingRow = await EventRepository.createQueryBuilder("event")
      .select("COALESCE(SUM(event.pendingAmount), 0)", "total")
      .where("event.paymentStatus != :paid", { paid: PaymentStatus.PAID })
      .getRawOne<{ total: string }>();

    return {
      message: "success",
      data: {
        activeEvents,
        pendingEvents,
        monthlyRevenue: Number(revenueRow?.total ?? 0),
        outstandingPayments: Number(outstandingRow?.total ?? 0),
      },
    };
  },

  getUpcomingEvents: async ({ limit }: { limit: number }) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const rows = await EventRepository.createQueryBuilder("event")
      .select([
        "event.id AS id",
        "event.slug AS slug",
        "event.name AS name",
        "event.pickupDate AS date",
        "event.clientName AS client",
        "event.paymentStatus AS paymentStatus",
      ])
      .where("event.pickupDate >= :today", { today })
      .orderBy("event.pickupDate", "ASC")
      .limit(limit)
      .getRawMany<{
        id: string;
        slug: string;
        name: string;
        date: string;
        client: string;
        paymentStatus: PaymentStatus;
      }>();

    const data = rows.map((row) => ({
      ...row,
      vehiclesRequired: null as number | null,
    }));
    return { message: "success", data };
  },

  getPaymentStatus: async () => {
    const rows = await EventRepository.createQueryBuilder("event")
      .select("event.paymentStatus", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("event.paymentStatus")
      .getRawMany<{ status: PaymentStatus; count: string }>();

    const data = rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
    }));
    return { message: "success", data };
  },

  getMonthlyTargets: async ({
    months = 6,
    from,
    to,
  }: {
    months?: number;
    from?: string;
    to?: string;
  }) => {
    const qb = TransactionRepository.createQueryBuilder("transaction")
      .select("DATE_TRUNC('month', transaction.paidAt)", "month")
      .addSelect("COALESCE(SUM(transaction.amountReceived), 0)", "total")
      .where("transaction.status = :paid", { paid: PaymentStatus.PAID });

    if (from && to) {
      qb.andWhere("transaction.paidAt >= :from", {
        from: new Date(from),
      }).andWhere("transaction.paidAt < :to", { to: new Date(to) });
    } else {
      // First day of the month (months-1) months ago
      const now = new Date();
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1),
        1
      );
      qb.andWhere("transaction.paidAt >= :startDate", { startDate });
    }

    const rows = await qb
      .groupBy("DATE_TRUNC('month', transaction.paidAt)")
      .orderBy("DATE_TRUNC('month', transaction.paidAt)", "ASC")
      .getRawMany<{ month: Date; total: string }>();

    const data = rows.map((r) => ({
      month: new Date(r.month).toISOString().slice(0, 7),
      revenue: Number(r.total),
    }));

    return { message: "success", data };
  },

  getRecentActivities: async ({ limit }: { limit: number }) => {
    const notifications = await NotificationRepository.createQueryBuilder(
      "notification"
    )
      .leftJoin("notification.event", "event")
      .select([
        "notification.id AS id",
        "'notification' AS type",
        "notification.title AS title",
        "notification.description AS description",
        "event.slug AS eventSlug",
        "notification.createdAt AS createdAt",
      ])
      .orderBy("notification.createdAt", "DESC")
      .limit(limit)
      .getRawMany();

    const paidPayments = await TransactionRepository.createQueryBuilder(
      "transaction"
    )
      .leftJoin("transaction.event", "event")
      .select([
        "transaction.id AS id",
        "'payment' AS type",
        "'Payment received' AS title",
        "event.slug AS eventSlug",
        "transaction.paidAt AS createdAt",
      ])
      .where("transaction.status = :paid", { paid: PaymentStatus.PAID })
      .andWhere("transaction.paidAt IS NOT NULL")
      .orderBy("transaction.paidAt", "DESC")
      .limit(limit)
      .getRawMany();

    const items = [...notifications, ...paidPayments]
      .filter((x: any) => x.createdAt)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);

    return { message: "success", data: items };
  },

  getDashboard: async ({
    from,
    to,
    limit,
    months,
  }: {
    from?: string;
    to?: string;
    limit: number;
    months: number;
  }) => {
    const [kpis, upcoming, paymentStatus, revenueSeries, activities] =
      await Promise.all([
        dashboardService.getKpis({ from, to }),
        dashboardService.getUpcomingEvents({ limit }),
        dashboardService.getPaymentStatus(),
        dashboardService.getMonthlyTargets({ months, from, to }),
        dashboardService.getRecentActivities({ limit }),
      ]);

    return {
      message: "success",
      data: {
        kpis: kpis.data,
        upcomingEvents: upcoming.data,
        paymentStatus: paymentStatus.data,
        revenueSeries: revenueSeries.data,
        recentActivities: activities.data,
      },
    };
  },
};

export default dashboardService;
