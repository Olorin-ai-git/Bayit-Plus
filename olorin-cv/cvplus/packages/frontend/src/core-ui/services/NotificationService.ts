export class NotificationService {
  static notify(message: string, type: string = 'info') {
    logger.info('[' + type.toUpperCase() + '] ' + message);
  }

  static success(message: string) {
    this.notify(message, 'success');
  }

  static error(message: string) {
    this.notify(message, 'error');
  }

  static info(message: string) {
    this.notify(message, 'info');
  }

  static warning(message: string) {
    this.notify(message, 'warning');
  }
}

export const notificationService = new NotificationService();
