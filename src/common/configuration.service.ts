export class Configuration {
  static get envs() {
    return () => ({
      environment: process.env.NODE_ENV || 'Development',
      timezone: 'America/Sao_Paulo',
      telegram: {
        bot: {
          key: process.env.TELEGRAM_BOT_KEY,
        },
      },
      gcp: {
        region: process.env.GCLOUD_REGION,
        collection: process.env.GCLOUD_FIRESTORE_COLLECTION,
        projectId: process.env.GCLOUD_PROJECT,
        privateKey: process.env.GCLOUD_FIREBASE_PRIVATE_KEY.replace(
          /\\n/g,
          '\n',
        ),
        email: process.env.GCLOUD_FIREBASE_EMAIL,
        loggingLevel: process.env.GCLOUD_LOGGING_MINIMUM_LEVEL || 'info',
        pubsub: {
          topic: process.env.GCLOUD_PUBSUB_TOPIC,
        },
      },
    });
  }
}
