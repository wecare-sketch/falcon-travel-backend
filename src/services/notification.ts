import { AppDataSource } from "../config/db";
// import { getIO } from "../config/socket";
import { EventType } from "../constants/enums";
import { Event } from "../entities/event";
import { Notification } from "../entities/notifications";
import { User } from "../entities/user";
import { NotificationInputDts } from "../types/notification";
import userService from "./user";

const NotificationRepository = AppDataSource.getRepository(Notification);

const notificationService = {
  send: async (notification: NotificationInputDts, recipients: User[]) => {
    // for (const user of recipients) {
    //   getIO()
    //     .to(`user_${user.email}`)
    //     .emit(notification.emit_event, {
    //       message: notification.message,
    //       ...notification.metadata,
    //     });
    // }

    const relation = notification.event
      ? { event: notification.event }
      : { request: notification.request };

    await Promise.all(
      recipients.map(async (user) => {
        const newNotification = NotificationRepository.create({
          title: notification.title,
          description: notification.message,
          type: notification.eventType,
          read: false,
          ...relation,
          user: user,
        });

        await NotificationRepository.save(newNotification);
      })
    );

    const availableAdmins = await userService.getAdmins();

    await Promise.all(
      availableAdmins.map(async (admin) => {
        const newNotification = NotificationRepository.create({
          title: notification.title,
          description: notification.message,
          type: notification.eventType,
          read: false,
          ...relation,
          user: admin,
        });

        await NotificationRepository.save(newNotification);
      })
    );
  },
};

export default notificationService;
