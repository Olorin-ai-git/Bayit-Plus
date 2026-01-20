#!/usr/bin/env python3
"""
FAQ Seeding Script
Seeds the FAQ database with comprehensive entries in all supported languages.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.support import FAQEntry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# FAQ Data organized by category
FAQ_DATA = [
    # =============================================================================
    # GENERAL (10 entries)
    # =============================================================================
    {
        "question_key": "help.faq.general.whatIsBayit.question",
        "answer_key": "help.faq.general.whatIsBayit.answer",
        "category": "general",
        "order": 1,
        "is_featured": True,
        "translations": {
            "en": {
                "question": "What is Bayit+?",
                "answer": "Bayit+ is a premium streaming platform offering live TV, video on demand, podcasts, and radio. It features voice control, personalized recommendations, Jewish content, and multi-platform support for Web, iOS, Android, Apple TV, Android TV, and CarPlay."
            },
            "he": {
                "question": "מה זה Bayit+?",
                "answer": "Bayit+ היא פלטפורמת סטרימינג פרימיום המציעה טלוויזיה חיה, וידאו לפי דרישה, פודקאסטים ורדיו. היא כוללת שליטה קולית, המלצות מותאמות אישית, תוכן יהודי ותמיכה במגוון פלטפורמות כולל ווב, iOS, Android, Apple TV, Android TV ו-CarPlay."
            },
            "es": {
                "question": "Que es Bayit+?",
                "answer": "Bayit+ es una plataforma de streaming premium que ofrece television en vivo, video bajo demanda, podcasts y radio. Cuenta con control por voz, recomendaciones personalizadas, contenido judio y soporte multiplataforma para Web, iOS, Android, Apple TV, Android TV y CarPlay."
            }
        }
    },
    {
        "question_key": "help.faq.general.platforms.question",
        "answer_key": "help.faq.general.platforms.answer",
        "category": "general",
        "order": 2,
        "translations": {
            "en": {
                "question": "What devices can I use to watch Bayit+?",
                "answer": "Bayit+ is available on: Web browsers (Chrome, Firefox, Safari, Edge), iOS devices (iPhone, iPad), Android phones and tablets, Apple TV, Android TV and Google TV, and CarPlay for audio content while driving."
            },
            "he": {
                "question": "באילו מכשירים אפשר לצפות ב-Bayit+?",
                "answer": "Bayit+ זמין ב: דפדפני אינטרנט (Chrome, Firefox, Safari, Edge), מכשירי iOS (iPhone, iPad), טלפונים וטאבלטים Android, Apple TV, Android TV ו-Google TV, ו-CarPlay לתוכן שמע בזמן נהיגה."
            },
            "es": {
                "question": "En que dispositivos puedo ver Bayit+?",
                "answer": "Bayit+ esta disponible en: navegadores web (Chrome, Firefox, Safari, Edge), dispositivos iOS (iPhone, iPad), telefonos y tabletas Android, Apple TV, Android TV y Google TV, y CarPlay para contenido de audio mientras conduce."
            }
        }
    },
    {
        "question_key": "help.faq.general.languages.question",
        "answer_key": "help.faq.general.languages.answer",
        "category": "general",
        "order": 3,
        "translations": {
            "en": {
                "question": "What languages does Bayit+ support?",
                "answer": "Bayit+ supports English, Hebrew, and Spanish for the user interface. Content is available in multiple languages with subtitles in various languages. Voice control works in all supported interface languages."
            },
            "he": {
                "question": "באילו שפות Bayit+ תומך?",
                "answer": "Bayit+ תומך באנגלית, עברית וספרדית לממשק המשתמש. תוכן זמין במספר שפות עם כתוביות בשפות שונות. שליטה קולית עובדת בכל שפות הממשק הנתמכות."
            },
            "es": {
                "question": "Que idiomas admite Bayit+?",
                "answer": "Bayit+ admite ingles, hebreo y espanol para la interfaz de usuario. El contenido esta disponible en varios idiomas con subtitulos en diferentes idiomas. El control por voz funciona en todos los idiomas de interfaz admitidos."
            }
        }
    },
    {
        "question_key": "help.faq.general.simultaneous.question",
        "answer_key": "help.faq.general.simultaneous.answer",
        "category": "general",
        "order": 4,
        "translations": {
            "en": {
                "question": "How many devices can stream at the same time?",
                "answer": "The number of simultaneous streams depends on your subscription: Basic plan allows 1 stream, Standard allows 2 streams, Premium allows 4 streams, and Family plan allows 6 streams."
            },
            "he": {
                "question": "כמה מכשירים יכולים להזרים בו-זמנית?",
                "answer": "מספר השידורים בו-זמנית תלוי במנוי שלך: תוכנית בסיסית מאפשרת שידור 1, סטנדרט מאפשר 2 שידורים, פרימיום מאפשר 4 שידורים, ותוכנית משפחתית מאפשרת 6 שידורים."
            },
            "es": {
                "question": "Cuantos dispositivos pueden transmitir al mismo tiempo?",
                "answer": "El numero de transmisiones simultaneas depende de tu suscripcion: el plan Basico permite 1 transmision, Estandar permite 2, Premium permite 4, y el plan Familiar permite 6 transmisiones."
            }
        }
    },
    {
        "question_key": "help.faq.general.offline.question",
        "answer_key": "help.faq.general.offline.answer",
        "category": "general",
        "order": 5,
        "translations": {
            "en": {
                "question": "Can I watch content offline?",
                "answer": "Yes, you can download content for offline viewing on iOS and Android mobile devices. Downloads are available for most on-demand content. Downloaded content expires after 30 days or 48 hours after you start watching."
            },
            "he": {
                "question": "האם אפשר לצפות בתוכן במצב לא מקוון?",
                "answer": "כן, אפשר להוריד תוכן לצפייה במצב לא מקוון במכשירי iOS ו-Android ניידים. הורדות זמינות לרוב התוכן לפי דרישה. תוכן שהורד פג תוקף לאחר 30 יום או 48 שעות מרגע שהתחלת לצפות."
            },
            "es": {
                "question": "Puedo ver contenido sin conexion?",
                "answer": "Si, puedes descargar contenido para verlo sin conexion en dispositivos moviles iOS y Android. Las descargas estan disponibles para la mayoria del contenido bajo demanda. El contenido descargado caduca despues de 30 dias o 48 horas despues de comenzar a verlo."
            }
        }
    },
    {
        "question_key": "help.faq.general.quality.question",
        "answer_key": "help.faq.general.quality.answer",
        "category": "general",
        "order": 6,
        "translations": {
            "en": {
                "question": "What video quality is available?",
                "answer": "Video quality depends on your subscription and internet speed. Basic offers SD (480p), Standard offers HD (1080p), and Premium offers 4K Ultra HD where available. Quality automatically adjusts based on your connection."
            },
            "he": {
                "question": "איזו איכות וידאו זמינה?",
                "answer": "איכות הווידאו תלויה במנוי ובמהירות האינטרנט שלך. בסיסי מציע SD (480p), סטנדרט מציע HD (1080p), ופרימיום מציע 4K Ultra HD היכן שזמין. האיכות מתכווננת אוטומטית לפי החיבור שלך."
            },
            "es": {
                "question": "Que calidad de video esta disponible?",
                "answer": "La calidad del video depende de tu suscripcion y velocidad de internet. Basico ofrece SD (480p), Estandar ofrece HD (1080p), y Premium ofrece 4K Ultra HD donde este disponible. La calidad se ajusta automaticamente segun tu conexion."
            }
        }
    },
    {
        "question_key": "help.faq.general.freeTrial.question",
        "answer_key": "help.faq.general.freeTrial.answer",
        "category": "general",
        "order": 7,
        "translations": {
            "en": {
                "question": "Is there a free trial?",
                "answer": "Yes, new users can enjoy a 7-day free trial of the Premium plan. No credit card is required to start the trial. You can cancel anytime before the trial ends without being charged."
            },
            "he": {
                "question": "האם יש תקופת ניסיון חינם?",
                "answer": "כן, משתמשים חדשים יכולים ליהנות מתקופת ניסיון חינם של 7 ימים לתוכנית פרימיום. לא נדרש כרטיס אשראי להתחלת הניסיון. אפשר לבטל בכל עת לפני סיום הניסיון ללא חיוב."
            },
            "es": {
                "question": "Hay una prueba gratuita?",
                "answer": "Si, los nuevos usuarios pueden disfrutar de una prueba gratuita de 7 dias del plan Premium. No se requiere tarjeta de credito para iniciar la prueba. Puedes cancelar en cualquier momento antes de que termine la prueba sin cargos."
            }
        }
    },
    {
        "question_key": "help.faq.general.profiles.question",
        "answer_key": "help.faq.general.profiles.answer",
        "category": "general",
        "order": 8,
        "translations": {
            "en": {
                "question": "Can I create multiple profiles?",
                "answer": "Yes, you can create up to 5 profiles per account. Each profile has its own watchlist, viewing history, and personalized recommendations. You can also create Kids profiles with parental controls."
            },
            "he": {
                "question": "האם אפשר ליצור מספר פרופילים?",
                "answer": "כן, אפשר ליצור עד 5 פרופילים לחשבון. לכל פרופיל יש רשימת צפייה, היסטוריית צפייה והמלצות מותאמות אישית משלו. אפשר גם ליצור פרופילי ילדים עם בקרת הורים."
            },
            "es": {
                "question": "Puedo crear varios perfiles?",
                "answer": "Si, puedes crear hasta 5 perfiles por cuenta. Cada perfil tiene su propia lista de seguimiento, historial de visualizacion y recomendaciones personalizadas. Tambien puedes crear perfiles de ninos con controles parentales."
            }
        }
    },
    {
        "question_key": "help.faq.general.support.question",
        "answer_key": "help.faq.general.support.answer",
        "category": "general",
        "order": 9,
        "translations": {
            "en": {
                "question": "How can I contact support?",
                "answer": "You can contact support through: Voice assistant (say 'I need help'), in-app support tickets, email support, or our documentation and FAQ. Support is available 24/7 in English, Hebrew, and Spanish."
            },
            "he": {
                "question": "איך אפשר ליצור קשר עם התמיכה?",
                "answer": "אפשר ליצור קשר עם התמיכה דרך: עוזר קולי (אמרו 'אני צריך עזרה'), פניות תמיכה באפליקציה, תמיכה באימייל, או התיעוד ושאלות נפוצות שלנו. התמיכה זמינה 24/7 באנגלית, עברית וספרדית."
            },
            "es": {
                "question": "Como puedo contactar al soporte?",
                "answer": "Puedes contactar al soporte a traves de: asistente de voz (di 'Necesito ayuda'), tickets de soporte en la aplicacion, soporte por correo electronico, o nuestra documentacion y FAQ. El soporte esta disponible 24/7 en ingles, hebreo y espanol."
            }
        }
    },
    {
        "question_key": "help.faq.general.updates.question",
        "answer_key": "help.faq.general.updates.answer",
        "category": "general",
        "order": 10,
        "translations": {
            "en": {
                "question": "How often is new content added?",
                "answer": "New content is added daily, including movies, TV shows, and live events. Our AI librarian continuously curates and updates the catalog. Check the 'New Arrivals' section to see the latest additions."
            },
            "he": {
                "question": "באיזו תדירות מתווסף תוכן חדש?",
                "answer": "תוכן חדש מתווסף מדי יום, כולל סרטים, תוכניות טלוויזיה ואירועים חיים. הספרן AI שלנו אוצר ומעדכן את הקטלוג באופן רציף. בדקו את הקטע 'חדש באתר' לראות את התוספות האחרונות."
            },
            "es": {
                "question": "Con que frecuencia se agrega contenido nuevo?",
                "answer": "Se agrega contenido nuevo diariamente, incluyendo peliculas, programas de TV y eventos en vivo. Nuestro bibliotecario AI cura y actualiza continuamente el catalogo. Consulta la seccion 'Novedades' para ver las ultimas adiciones."
            }
        }
    },
    # =============================================================================
    # BILLING (10 entries)
    # =============================================================================
    {
        "question_key": "help.faq.billing.plans.question",
        "answer_key": "help.faq.billing.plans.answer",
        "category": "billing",
        "order": 1,
        "is_featured": True,
        "translations": {
            "en": {
                "question": "What subscription plans are available?",
                "answer": "We offer four plans: Basic ($7.99/month, 1 screen, SD), Standard ($12.99/month, 2 screens, HD), Premium ($17.99/month, 4 screens, 4K), and Family ($24.99/month, 6 screens, 4K with extended features)."
            },
            "he": {
                "question": "אילו תוכניות מנוי זמינות?",
                "answer": "אנו מציעים ארבע תוכניות: בסיסית ($7.99/חודש, מסך 1, SD), סטנדרט ($12.99/חודש, 2 מסכים, HD), פרימיום ($17.99/חודש, 4 מסכים, 4K), ומשפחתית ($24.99/חודש, 6 מסכים, 4K עם תכונות מורחבות)."
            },
            "es": {
                "question": "Que planes de suscripcion estan disponibles?",
                "answer": "Ofrecemos cuatro planes: Basico ($7.99/mes, 1 pantalla, SD), Estandar ($12.99/mes, 2 pantallas, HD), Premium ($17.99/mes, 4 pantallas, 4K), y Familiar ($24.99/mes, 6 pantallas, 4K con funciones extendidas)."
            }
        }
    },
    {
        "question_key": "help.faq.billing.payment.question",
        "answer_key": "help.faq.billing.payment.answer",
        "category": "billing",
        "order": 2,
        "translations": {
            "en": {
                "question": "What payment methods are accepted?",
                "answer": "We accept major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay, and direct carrier billing on supported mobile networks."
            },
            "he": {
                "question": "אילו אמצעי תשלום מתקבלים?",
                "answer": "אנו מקבלים כרטיסי אשראי מרכזיים (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay, וחיוב ישיר דרך ספק סלולר ברשתות נתמכות."
            },
            "es": {
                "question": "Que metodos de pago se aceptan?",
                "answer": "Aceptamos las principales tarjetas de credito (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay y facturacion directa del operador en redes moviles compatibles."
            }
        }
    },
    {
        "question_key": "help.faq.billing.cancel.question",
        "answer_key": "help.faq.billing.cancel.answer",
        "category": "billing",
        "order": 3,
        "translations": {
            "en": {
                "question": "How do I cancel my subscription?",
                "answer": "Go to Account Settings > Subscription > Cancel Subscription. Your access continues until the end of your billing period. You can reactivate anytime without losing your profiles or watchlist."
            },
            "he": {
                "question": "איך מבטלים את המנוי?",
                "answer": "עברו להגדרות חשבון > מנוי > ביטול מנוי. הגישה שלכם ממשיכה עד סוף תקופת החיוב. אפשר להפעיל מחדש בכל עת מבלי לאבד את הפרופילים או רשימת הצפייה."
            },
            "es": {
                "question": "Como cancelo mi suscripcion?",
                "answer": "Ve a Configuracion de cuenta > Suscripcion > Cancelar suscripcion. Tu acceso continua hasta el final de tu periodo de facturacion. Puedes reactivar en cualquier momento sin perder tus perfiles o lista de seguimiento."
            }
        }
    },
    {
        "question_key": "help.faq.billing.upgrade.question",
        "answer_key": "help.faq.billing.upgrade.answer",
        "category": "billing",
        "order": 4,
        "translations": {
            "en": {
                "question": "How do I upgrade or downgrade my plan?",
                "answer": "Go to Account Settings > Subscription > Change Plan. Upgrades take effect immediately with prorated billing. Downgrades take effect at the start of your next billing cycle."
            },
            "he": {
                "question": "איך משדרגים או מורידים את התוכנית?",
                "answer": "עברו להגדרות חשבון > מנוי > שינוי תוכנית. שדרוגים נכנסים לתוקף מיד עם חיוב יחסי. הורדות נכנסות לתוקף בתחילת מחזור החיוב הבא שלכם."
            },
            "es": {
                "question": "Como mejoro o reduzco mi plan?",
                "answer": "Ve a Configuracion de cuenta > Suscripcion > Cambiar plan. Las mejoras entran en vigor inmediatamente con facturacion prorrateada. Las reducciones entran en vigor al inicio de tu proximo ciclo de facturacion."
            }
        }
    },
    {
        "question_key": "help.faq.billing.refund.question",
        "answer_key": "help.faq.billing.refund.answer",
        "category": "billing",
        "order": 5,
        "translations": {
            "en": {
                "question": "Can I get a refund?",
                "answer": "Refunds are available within 14 days of your initial purchase or renewal if you haven't used the service. Contact support with your account details to request a refund."
            },
            "he": {
                "question": "האם אפשר לקבל החזר כספי?",
                "answer": "החזרים זמינים תוך 14 יום מהרכישה הראשונית או החידוש אם לא השתמשתם בשירות. פנו לתמיכה עם פרטי החשבון שלכם לבקשת החזר."
            },
            "es": {
                "question": "Puedo obtener un reembolso?",
                "answer": "Los reembolsos estan disponibles dentro de los 14 dias de tu compra inicial o renovacion si no has usado el servicio. Contacta al soporte con los detalles de tu cuenta para solicitar un reembolso."
            }
        }
    },
    {
        "question_key": "help.faq.billing.failed.question",
        "answer_key": "help.faq.billing.failed.answer",
        "category": "billing",
        "order": 6,
        "translations": {
            "en": {
                "question": "What happens if my payment fails?",
                "answer": "If payment fails, we'll retry automatically over the next few days. You'll receive email notifications. Update your payment method in Account Settings to avoid service interruption."
            },
            "he": {
                "question": "מה קורה אם התשלום נכשל?",
                "answer": "אם התשלום נכשל, ננסה שוב אוטומטית במהלך הימים הבאים. תקבלו התראות באימייל. עדכנו את אמצעי התשלום בהגדרות חשבון למניעת הפרעה בשירות."
            },
            "es": {
                "question": "Que pasa si mi pago falla?",
                "answer": "Si el pago falla, lo reintentaremos automaticamente durante los proximos dias. Recibiras notificaciones por correo electronico. Actualiza tu metodo de pago en Configuracion de cuenta para evitar la interrupcion del servicio."
            }
        }
    },
    {
        "question_key": "help.faq.billing.invoice.question",
        "answer_key": "help.faq.billing.invoice.answer",
        "category": "billing",
        "order": 7,
        "translations": {
            "en": {
                "question": "How can I view my billing history?",
                "answer": "Go to Account Settings > Billing History to view all past invoices. You can download invoices as PDF for your records. Email receipts are also sent after each payment."
            },
            "he": {
                "question": "איך אפשר לראות את היסטוריית החיובים?",
                "answer": "עברו להגדרות חשבון > היסטוריית חיובים לצפייה בכל החשבוניות הקודמות. אפשר להוריד חשבוניות כ-PDF לרשומות שלכם. קבלות באימייל נשלחות גם לאחר כל תשלום."
            },
            "es": {
                "question": "Como puedo ver mi historial de facturacion?",
                "answer": "Ve a Configuracion de cuenta > Historial de facturacion para ver todas las facturas anteriores. Puedes descargar facturas como PDF para tus registros. Los recibos por correo electronico tambien se envian despues de cada pago."
            }
        }
    },
    {
        "question_key": "help.faq.billing.promo.question",
        "answer_key": "help.faq.billing.promo.answer",
        "category": "billing",
        "order": 8,
        "translations": {
            "en": {
                "question": "How do I apply a promo code?",
                "answer": "Enter your promo code during checkout or go to Account Settings > Subscription > Apply Promo Code. Promo codes cannot be combined and may have specific terms and expiration dates."
            },
            "he": {
                "question": "איך מזינים קוד קופון?",
                "answer": "הזינו את קוד הקופון בעת התשלום או עברו להגדרות חשבון > מנוי > החל קוד קופון. לא ניתן לשלב קודי קופון ויכולים להיות להם תנאים ותאריכי תפוגה ספציפיים."
            },
            "es": {
                "question": "Como aplico un codigo promocional?",
                "answer": "Ingresa tu codigo promocional durante el pago o ve a Configuracion de cuenta > Suscripcion > Aplicar codigo promocional. Los codigos promocionales no se pueden combinar y pueden tener terminos especificos y fechas de vencimiento."
            }
        }
    },
    {
        "question_key": "help.faq.billing.giftcard.question",
        "answer_key": "help.faq.billing.giftcard.answer",
        "category": "billing",
        "order": 9,
        "translations": {
            "en": {
                "question": "Can I purchase a gift subscription?",
                "answer": "Yes, gift subscriptions are available for 1, 3, 6, or 12 months. Go to the Gift Center on our website to purchase. The recipient receives an email with redemption instructions."
            },
            "he": {
                "question": "האם אפשר לרכוש מנוי מתנה?",
                "answer": "כן, מנויי מתנה זמינים ל-1, 3, 6 או 12 חודשים. עברו למרכז המתנות באתר שלנו לרכישה. המקבל מקבל אימייל עם הוראות מימוש."
            },
            "es": {
                "question": "Puedo comprar una suscripcion de regalo?",
                "answer": "Si, las suscripciones de regalo estan disponibles por 1, 3, 6 o 12 meses. Ve al Centro de regalos en nuestro sitio web para comprar. El destinatario recibe un correo electronico con instrucciones de canje."
            }
        }
    },
    {
        "question_key": "help.faq.billing.currency.question",
        "answer_key": "help.faq.billing.currency.answer",
        "category": "billing",
        "order": 10,
        "translations": {
            "en": {
                "question": "What currency will I be charged in?",
                "answer": "You'll be charged in your local currency when available (USD, EUR, ILS, etc.). The currency is determined by your payment method's billing address. Exchange rates are set at checkout."
            },
            "he": {
                "question": "באיזה מטבע אחויב?",
                "answer": "תחויבו במטבע המקומי שלכם כשזמין (USD, EUR, ILS וכו'). המטבע נקבע לפי כתובת החיוב של אמצעי התשלום שלכם. שערי החליפין נקבעים בעת התשלום."
            },
            "es": {
                "question": "En que moneda se me cobrara?",
                "answer": "Se te cobrara en tu moneda local cuando este disponible (USD, EUR, ILS, etc.). La moneda se determina por la direccion de facturacion de tu metodo de pago. Los tipos de cambio se establecen al momento del pago."
            }
        }
    },
    # =============================================================================
    # TECHNICAL (12 entries)
    # =============================================================================
    {
        "question_key": "help.faq.technical.internet.question",
        "answer_key": "help.faq.technical.internet.answer",
        "category": "technical",
        "order": 1,
        "is_featured": True,
        "translations": {
            "en": {
                "question": "What internet speed do I need?",
                "answer": "Minimum 3 Mbps for SD, 5 Mbps for HD, 15 Mbps for Full HD, and 25 Mbps for 4K streaming. For the best experience, we recommend a stable connection above these minimums."
            },
            "he": {
                "question": "איזו מהירות אינטרנט אני צריך?",
                "answer": "מינימום 3 Mbps ל-SD, 5 Mbps ל-HD, 15 Mbps ל-Full HD, ו-25 Mbps לסטרימינג 4K. לחוויה הטובה ביותר, אנו ממליצים על חיבור יציב מעל מינימומים אלה."
            },
            "es": {
                "question": "Que velocidad de internet necesito?",
                "answer": "Minimo 3 Mbps para SD, 5 Mbps para HD, 15 Mbps para Full HD, y 25 Mbps para streaming 4K. Para la mejor experiencia, recomendamos una conexion estable por encima de estos minimos."
            }
        }
    },
    {
        "question_key": "help.faq.technical.buffering.question",
        "answer_key": "help.faq.technical.buffering.answer",
        "category": "technical",
        "order": 2,
        "translations": {
            "en": {
                "question": "Why is my video buffering?",
                "answer": "Buffering usually indicates slow internet. Try: restarting your router, closing other apps using bandwidth, moving closer to your WiFi router, lowering video quality in settings, or using a wired ethernet connection."
            },
            "he": {
                "question": "למה הווידאו שלי עוצר לטעינה?",
                "answer": "הפסקות טעינה בדרך כלל מצביעות על אינטרנט איטי. נסו: לאתחל את הנתב, לסגור אפליקציות אחרות שצורכות רוחב פס, להתקרב לנתב ה-WiFi, להוריד את איכות הווידאו בהגדרות, או להשתמש בחיבור אתרנט קווי."
            },
            "es": {
                "question": "Por que mi video esta almacenando en bufer?",
                "answer": "El almacenamiento en bufer generalmente indica internet lento. Intenta: reiniciar tu router, cerrar otras aplicaciones que usen ancho de banda, acercarte a tu router WiFi, reducir la calidad de video en configuracion, o usar una conexion ethernet por cable."
            }
        }
    },
    {
        "question_key": "help.faq.technical.chromecast.question",
        "answer_key": "help.faq.technical.chromecast.answer",
        "category": "technical",
        "order": 3,
        "translations": {
            "en": {
                "question": "Does Bayit+ support Chromecast?",
                "answer": "Yes, you can cast from the Bayit+ mobile app (iOS and Android) or web browser to any Chromecast or Chromecast-enabled device. Tap the cast icon while playing content."
            },
            "he": {
                "question": "האם Bayit+ תומך ב-Chromecast?",
                "answer": "כן, אפשר להעביר מאפליקציית Bayit+ הניידת (iOS ו-Android) או מדפדפן האינטרנט לכל מכשיר Chromecast או מכשיר התומך ב-Chromecast. הקישו על אייקון ההעברה בזמן ניגון תוכן."
            },
            "es": {
                "question": "Bayit+ es compatible con Chromecast?",
                "answer": "Si, puedes transmitir desde la aplicacion movil de Bayit+ (iOS y Android) o navegador web a cualquier Chromecast o dispositivo habilitado para Chromecast. Toca el icono de transmision mientras reproduces contenido."
            }
        }
    },
    {
        "question_key": "help.faq.technical.airplay.question",
        "answer_key": "help.faq.technical.airplay.answer",
        "category": "technical",
        "order": 4,
        "translations": {
            "en": {
                "question": "Does Bayit+ support AirPlay?",
                "answer": "Yes, you can use AirPlay from any iOS device or Mac to stream to Apple TV or AirPlay-compatible smart TVs. Tap the AirPlay icon in the player controls."
            },
            "he": {
                "question": "האם Bayit+ תומך ב-AirPlay?",
                "answer": "כן, אפשר להשתמש ב-AirPlay מכל מכשיר iOS או Mac להזרמה ל-Apple TV או טלוויזיות חכמות תואמות AirPlay. הקישו על אייקון AirPlay בפקדי הנגן."
            },
            "es": {
                "question": "Bayit+ es compatible con AirPlay?",
                "answer": "Si, puedes usar AirPlay desde cualquier dispositivo iOS o Mac para transmitir a Apple TV o televisores inteligentes compatibles con AirPlay. Toca el icono de AirPlay en los controles del reproductor."
            }
        }
    },
    {
        "question_key": "help.faq.technical.hdmi.question",
        "answer_key": "help.faq.technical.hdmi.answer",
        "category": "technical",
        "order": 5,
        "translations": {
            "en": {
                "question": "Can I connect my device to a TV via HDMI?",
                "answer": "Yes, you can connect your laptop, tablet, or phone to a TV using an HDMI cable or adapter. This allows you to watch Bayit+ on a larger screen while controlling from your device."
            },
            "he": {
                "question": "האם אפשר לחבר את המכשיר לטלוויזיה דרך HDMI?",
                "answer": "כן, אפשר לחבר את המחשב הנייד, הטאבלט או הטלפון לטלוויזיה באמצעות כבל HDMI או מתאם. זה מאפשר לצפות ב-Bayit+ על מסך גדול יותר תוך שליטה מהמכשיר שלכם."
            },
            "es": {
                "question": "Puedo conectar mi dispositivo a un televisor via HDMI?",
                "answer": "Si, puedes conectar tu laptop, tableta o telefono a un televisor usando un cable o adaptador HDMI. Esto te permite ver Bayit+ en una pantalla mas grande mientras controlas desde tu dispositivo."
            }
        }
    },
    {
        "question_key": "help.faq.technical.vpn.question",
        "answer_key": "help.faq.technical.vpn.answer",
        "category": "technical",
        "order": 6,
        "translations": {
            "en": {
                "question": "Can I use Bayit+ with a VPN?",
                "answer": "While VPNs may work, they can cause slower speeds and playback issues. Some content may have geographic restrictions. For the best experience, we recommend connecting without a VPN."
            },
            "he": {
                "question": "האם אפשר להשתמש ב-Bayit+ עם VPN?",
                "answer": "בעוד ש-VPN עשוי לעבוד, הוא יכול לגרום למהירויות איטיות ובעיות ניגון. לתוכן מסוים עשויות להיות הגבלות גיאוגרפיות. לחוויה הטובה ביותר, אנו ממליצים להתחבר ללא VPN."
            },
            "es": {
                "question": "Puedo usar Bayit+ con una VPN?",
                "answer": "Aunque las VPN pueden funcionar, pueden causar velocidades mas lentas y problemas de reproduccion. Algunos contenidos pueden tener restricciones geograficas. Para la mejor experiencia, recomendamos conectarse sin una VPN."
            }
        }
    },
    {
        "question_key": "help.faq.technical.surround.question",
        "answer_key": "help.faq.technical.surround.answer",
        "category": "technical",
        "order": 7,
        "translations": {
            "en": {
                "question": "Does Bayit+ support surround sound?",
                "answer": "Yes, we support Dolby Digital 5.1 and Dolby Atmos on compatible devices and content. Make sure your audio equipment is properly configured and the content supports surround sound."
            },
            "he": {
                "question": "האם Bayit+ תומך בסראונד?",
                "answer": "כן, אנו תומכים ב-Dolby Digital 5.1 ו-Dolby Atmos במכשירים ותכנים תואמים. ודאו שציוד האודיו שלכם מוגדר כראוי ושהתוכן תומך בסראונד."
            },
            "es": {
                "question": "Bayit+ es compatible con sonido envolvente?",
                "answer": "Si, admitimos Dolby Digital 5.1 y Dolby Atmos en dispositivos y contenido compatibles. Asegurate de que tu equipo de audio este configurado correctamente y que el contenido admita sonido envolvente."
            }
        }
    },
    {
        "question_key": "help.faq.technical.browser.question",
        "answer_key": "help.faq.technical.browser.answer",
        "category": "technical",
        "order": 8,
        "translations": {
            "en": {
                "question": "Which web browsers are supported?",
                "answer": "We support Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+. For the best experience, keep your browser updated to the latest version. Internet Explorer is not supported."
            },
            "he": {
                "question": "אילו דפדפנים נתמכים?",
                "answer": "אנו תומכים ב-Chrome 90+, Firefox 88+, Safari 14+, ו-Edge 90+. לחוויה הטובה ביותר, שמרו על הדפדפן מעודכן לגרסה האחרונה. Internet Explorer אינו נתמך."
            },
            "es": {
                "question": "Que navegadores web son compatibles?",
                "answer": "Admitimos Chrome 90+, Firefox 88+, Safari 14+ y Edge 90+. Para la mejor experiencia, manten tu navegador actualizado a la ultima version. Internet Explorer no es compatible."
            }
        }
    },
    {
        "question_key": "help.faq.technical.appsize.question",
        "answer_key": "help.faq.technical.appsize.answer",
        "category": "technical",
        "order": 9,
        "translations": {
            "en": {
                "question": "How much storage space does the app need?",
                "answer": "The app requires about 150MB for iOS, 120MB for Android, and 80MB for TV apps. Downloaded content requires additional space - approximately 1GB per hour of HD video."
            },
            "he": {
                "question": "כמה מקום אחסון האפליקציה צריכה?",
                "answer": "האפליקציה דורשת כ-150MB ל-iOS, 120MB ל-Android, ו-80MB לאפליקציות TV. תוכן שהורד דורש מקום נוסף - כ-1GB לשעת וידאו HD."
            },
            "es": {
                "question": "Cuanto espacio de almacenamiento necesita la aplicacion?",
                "answer": "La aplicacion requiere aproximadamente 150MB para iOS, 120MB para Android y 80MB para aplicaciones de TV. El contenido descargado requiere espacio adicional - aproximadamente 1GB por hora de video HD."
            }
        }
    },
    {
        "question_key": "help.faq.technical.update.question",
        "answer_key": "help.faq.technical.update.answer",
        "category": "technical",
        "order": 10,
        "translations": {
            "en": {
                "question": "How do I update the Bayit+ app?",
                "answer": "On iOS, go to App Store > Updates. On Android, go to Play Store > My Apps. TV apps update automatically. Enable auto-updates to always have the latest features and fixes."
            },
            "he": {
                "question": "איך מעדכנים את אפליקציית Bayit+?",
                "answer": "ב-iOS, עברו ל-App Store > עדכונים. ב-Android, עברו ל-Play Store > האפליקציות שלי. אפליקציות TV מתעדכנות אוטומטית. הפעילו עדכונים אוטומטיים לקבלת התכונות והתיקונים האחרונים."
            },
            "es": {
                "question": "Como actualizo la aplicacion Bayit+?",
                "answer": "En iOS, ve a App Store > Actualizaciones. En Android, ve a Play Store > Mis aplicaciones. Las aplicaciones de TV se actualizan automaticamente. Habilita las actualizaciones automaticas para tener siempre las ultimas funciones y correcciones."
            }
        }
    },
    {
        "question_key": "help.faq.technical.pip.question",
        "answer_key": "help.faq.technical.pip.answer",
        "category": "technical",
        "order": 11,
        "translations": {
            "en": {
                "question": "Does Bayit+ support Picture-in-Picture?",
                "answer": "Yes, Picture-in-Picture (PiP) is supported on iOS, Android, and web browsers. This lets you watch in a small window while using other apps. Enable it in Settings > Playback > Picture-in-Picture."
            },
            "he": {
                "question": "האם Bayit+ תומך בתמונה-בתוך-תמונה?",
                "answer": "כן, תמונה-בתוך-תמונה (PiP) נתמך ב-iOS, Android ודפדפני אינטרנט. זה מאפשר לכם לצפות בחלון קטן בזמן שימוש באפליקציות אחרות. הפעילו זאת בהגדרות > ניגון > תמונה-בתוך-תמונה."
            },
            "es": {
                "question": "Bayit+ es compatible con Imagen en Imagen?",
                "answer": "Si, Imagen en Imagen (PiP) es compatible con iOS, Android y navegadores web. Esto te permite ver en una ventana pequena mientras usas otras aplicaciones. Habilitalo en Configuracion > Reproduccion > Imagen en Imagen."
            }
        }
    },
    {
        "question_key": "help.faq.technical.data.question",
        "answer_key": "help.faq.technical.data.answer",
        "category": "technical",
        "order": 12,
        "translations": {
            "en": {
                "question": "How much data does streaming use?",
                "answer": "Data usage varies by quality: SD uses about 1GB/hour, HD uses 3GB/hour, Full HD uses 5GB/hour, and 4K uses 7GB/hour. You can limit data usage in Settings > Playback > Data Saver."
            },
            "he": {
                "question": "כמה נתונים הסטרימינג צורך?",
                "answer": "צריכת הנתונים משתנה לפי איכות: SD צורך כ-1GB/שעה, HD צורך 3GB/שעה, Full HD צורך 5GB/שעה, ו-4K צורך 7GB/שעה. אפשר להגביל צריכת נתונים בהגדרות > ניגון > חוסך נתונים."
            },
            "es": {
                "question": "Cuantos datos usa el streaming?",
                "answer": "El uso de datos varia segun la calidad: SD usa aproximadamente 1GB/hora, HD usa 3GB/hora, Full HD usa 5GB/hora, y 4K usa 7GB/hora. Puedes limitar el uso de datos en Configuracion > Reproduccion > Ahorro de datos."
            }
        }
    },
    # =============================================================================
    # FEATURES (15 entries)
    # =============================================================================
    {
        "question_key": "help.faq.features.voice.question",
        "answer_key": "help.faq.features.voice.answer",
        "category": "features",
        "order": 1,
        "is_featured": True,
        "translations": {
            "en": {
                "question": "How do I use voice control?",
                "answer": "Say 'Hey Bayit' to activate voice control, or tap the microphone icon. You can search for content, control playback, navigate menus, and ask questions. Voice control works in English, Hebrew, and Spanish."
            },
            "he": {
                "question": "איך משתמשים בשליטה קולית?",
                "answer": "אמרו 'היי בית' להפעלת שליטה קולית, או הקישו על אייקון המיקרופון. אפשר לחפש תוכן, לשלוט בניגון, לנווט בתפריטים ולשאול שאלות. שליטה קולית עובדת באנגלית, עברית וספרדית."
            },
            "es": {
                "question": "Como uso el control por voz?",
                "answer": "Di 'Hey Bayit' para activar el control por voz, o toca el icono del microfono. Puedes buscar contenido, controlar la reproduccion, navegar menus y hacer preguntas. El control por voz funciona en ingles, hebreo y espanol."
            }
        }
    },
    {
        "question_key": "help.faq.features.recordings.question",
        "answer_key": "help.faq.features.recordings.answer",
        "category": "features",
        "order": 2,
        "translations": {
            "en": {
                "question": "How do I record live TV?",
                "answer": "While watching live TV, press the Record button or say 'Record this'. You can also schedule recordings from the TV Guide. Recordings are stored in the cloud and accessible from any device."
            },
            "he": {
                "question": "איך מקליטים טלוויזיה חיה?",
                "answer": "בזמן צפייה בטלוויזיה חיה, לחצו על כפתור ההקלטה או אמרו 'הקלט את זה'. אפשר גם לתזמן הקלטות מלוח השידורים. ההקלטות נשמרות בענן ונגישות מכל מכשיר."
            },
            "es": {
                "question": "Como grabo television en vivo?",
                "answer": "Mientras ves television en vivo, presiona el boton Grabar o di 'Grabar esto'. Tambien puedes programar grabaciones desde la Guia de TV. Las grabaciones se almacenan en la nube y son accesibles desde cualquier dispositivo."
            }
        }
    },
    {
        "question_key": "help.faq.features.watchlist.question",
        "answer_key": "help.faq.features.watchlist.answer",
        "category": "features",
        "order": 3,
        "translations": {
            "en": {
                "question": "How do I add content to my watchlist?",
                "answer": "Click the '+' or 'Add to Watchlist' button on any content. You can also say 'Add to my list'. Access your watchlist from the My Stuff section. Each profile has its own watchlist."
            },
            "he": {
                "question": "איך מוסיפים תוכן לרשימת הצפייה?",
                "answer": "לחצו על כפתור '+' או 'הוסף לרשימת צפייה' על כל תוכן. אפשר גם לומר 'הוסף לרשימה שלי'. גשו לרשימת הצפייה מהקטע 'הדברים שלי'. לכל פרופיל יש רשימת צפייה משלו."
            },
            "es": {
                "question": "Como agrego contenido a mi lista de seguimiento?",
                "answer": "Haz clic en el boton '+' o 'Agregar a la lista' en cualquier contenido. Tambien puedes decir 'Agregar a mi lista'. Accede a tu lista desde la seccion Mis cosas. Cada perfil tiene su propia lista."
            }
        }
    },
    {
        "question_key": "help.faq.features.subtitles.question",
        "answer_key": "help.faq.features.subtitles.answer",
        "category": "features",
        "order": 4,
        "translations": {
            "en": {
                "question": "How do I turn on subtitles?",
                "answer": "Tap the CC/Subtitles icon during playback or go to Settings > Subtitles. You can choose language, size, font, and background color. Settings are saved per profile."
            },
            "he": {
                "question": "איך מפעילים כתוביות?",
                "answer": "הקישו על אייקון CC/כתוביות בזמן ניגון או עברו להגדרות > כתוביות. אפשר לבחור שפה, גודל, גופן וצבע רקע. ההגדרות נשמרות לכל פרופיל."
            },
            "es": {
                "question": "Como activo los subtitulos?",
                "answer": "Toca el icono CC/Subtitulos durante la reproduccion o ve a Configuracion > Subtitulos. Puedes elegir idioma, tamano, fuente y color de fondo. La configuracion se guarda por perfil."
            }
        }
    },
    {
        "question_key": "help.faq.features.continue.question",
        "answer_key": "help.faq.features.continue.answer",
        "category": "features",
        "order": 5,
        "translations": {
            "en": {
                "question": "Does Bayit+ remember where I stopped watching?",
                "answer": "Yes, your viewing progress is automatically saved and synced across all devices. Just select 'Continue Watching' to resume from where you left off."
            },
            "he": {
                "question": "האם Bayit+ זוכר איפה הפסקתי לצפות?",
                "answer": "כן, התקדמות הצפייה שלכם נשמרת אוטומטית ומסונכרנת בכל המכשירים. פשוט בחרו 'המשך צפייה' כדי להמשיך מאיפה שהפסקתם."
            },
            "es": {
                "question": "Bayit+ recuerda donde deje de ver?",
                "answer": "Si, tu progreso de visualizacion se guarda automaticamente y se sincroniza en todos los dispositivos. Solo selecciona 'Continuar viendo' para reanudar desde donde lo dejaste."
            }
        }
    },
    {
        "question_key": "help.faq.features.search.question",
        "answer_key": "help.faq.features.search.answer",
        "category": "features",
        "order": 6,
        "translations": {
            "en": {
                "question": "How does search work?",
                "answer": "Use text or voice search to find content. Search by title, actor, director, genre, or description. Use filters to narrow results by type, year, rating, and more."
            },
            "he": {
                "question": "איך החיפוש עובד?",
                "answer": "השתמשו בחיפוש טקסט או קולי למציאת תוכן. חפשו לפי כותרת, שחקן, במאי, ז'אנר או תיאור. השתמשו במסננים לצמצום תוצאות לפי סוג, שנה, דירוג ועוד."
            },
            "es": {
                "question": "Como funciona la busqueda?",
                "answer": "Usa la busqueda de texto o voz para encontrar contenido. Busca por titulo, actor, director, genero o descripcion. Usa filtros para refinar resultados por tipo, ano, calificacion y mas."
            }
        }
    },
    {
        "question_key": "help.faq.features.recommendations.question",
        "answer_key": "help.faq.features.recommendations.answer",
        "category": "features",
        "order": 7,
        "translations": {
            "en": {
                "question": "How are recommendations personalized?",
                "answer": "Recommendations are based on your viewing history, favorites, ratings, and similar viewers' preferences. Each profile gets unique recommendations. Rate content to improve suggestions."
            },
            "he": {
                "question": "איך ההמלצות מותאמות אישית?",
                "answer": "ההמלצות מבוססות על היסטוריית הצפייה שלכם, מועדפים, דירוגים והעדפות של צופים דומים. כל פרופיל מקבל המלצות ייחודיות. דרגו תוכן לשיפור ההצעות."
            },
            "es": {
                "question": "Como se personalizan las recomendaciones?",
                "answer": "Las recomendaciones se basan en tu historial de visualizacion, favoritos, calificaciones y preferencias de espectadores similares. Cada perfil recibe recomendaciones unicas. Califica el contenido para mejorar las sugerencias."
            }
        }
    },
    {
        "question_key": "help.faq.features.downloads.question",
        "answer_key": "help.faq.features.downloads.answer",
        "category": "features",
        "order": 8,
        "translations": {
            "en": {
                "question": "How do I download content for offline viewing?",
                "answer": "On mobile devices, tap the download icon on supported content. Choose quality (Standard or High). Downloads expire after 30 days or 48 hours after starting playback."
            },
            "he": {
                "question": "איך מורידים תוכן לצפייה לא מקוונת?",
                "answer": "במכשירים ניידים, הקישו על אייקון ההורדה על תוכן נתמך. בחרו איכות (רגילה או גבוהה). הורדות פגות תוקף לאחר 30 יום או 48 שעות לאחר התחלת הניגון."
            },
            "es": {
                "question": "Como descargo contenido para ver sin conexion?",
                "answer": "En dispositivos moviles, toca el icono de descarga en el contenido compatible. Elige la calidad (Estandar o Alta). Las descargas caducan despues de 30 dias o 48 horas despues de iniciar la reproduccion."
            }
        }
    },
    {
        "question_key": "help.faq.features.watchparty.question",
        "answer_key": "help.faq.features.watchparty.answer",
        "category": "features",
        "order": 9,
        "translations": {
            "en": {
                "question": "What is a Watch Party?",
                "answer": "Watch Party lets you watch content synchronized with friends. Create a party, invite friends, and enjoy together with live chat. Available on web, mobile, and TV apps."
            },
            "he": {
                "question": "מה זה מסיבת צפייה?",
                "answer": "מסיבת צפייה מאפשרת לכם לצפות בתוכן מסונכרן עם חברים. צרו מסיבה, הזמינו חברים ותהנו יחד עם צ'אט חי. זמין בווב, נייד ואפליקציות TV."
            },
            "es": {
                "question": "Que es una Watch Party?",
                "answer": "Watch Party te permite ver contenido sincronizado con amigos. Crea una fiesta, invita amigos y disfruten juntos con chat en vivo. Disponible en web, movil y aplicaciones de TV."
            }
        }
    },
    {
        "question_key": "help.faq.features.epg.question",
        "answer_key": "help.faq.features.epg.answer",
        "category": "features",
        "order": 10,
        "translations": {
            "en": {
                "question": "How do I use the TV Guide?",
                "answer": "Access the TV Guide from the Live TV section. Browse channels and upcoming programs. Click a program to watch live, set a reminder, or schedule a recording."
            },
            "he": {
                "question": "איך משתמשים בלוח השידורים?",
                "answer": "גשו ללוח השידורים מהקטע 'טלוויזיה חיה'. דפדפו בערוצים ותוכניות עתידיות. לחצו על תוכנית לצפייה חיה, הגדרת תזכורת או תזמון הקלטה."
            },
            "es": {
                "question": "Como uso la Guia de TV?",
                "answer": "Accede a la Guia de TV desde la seccion TV en Vivo. Explora canales y programas proximos. Haz clic en un programa para ver en vivo, establecer un recordatorio o programar una grabacion."
            }
        }
    },
    {
        "question_key": "help.faq.features.flows.question",
        "answer_key": "help.faq.features.flows.answer",
        "category": "features",
        "order": 11,
        "translations": {
            "en": {
                "question": "What are Flows?",
                "answer": "Flows are curated content collections created by our editorial team and AI. They group related content by theme, mood, or event. Find Flows in the Discover section."
            },
            "he": {
                "question": "מה זה Flows?",
                "answer": "Flows הם אוספי תוכן אצורים שנוצרו על ידי צוות העריכה שלנו ו-AI. הם מקבצים תוכן קשור לפי נושא, מצב רוח או אירוע. מצאו Flows בקטע 'גלה'."
            },
            "es": {
                "question": "Que son los Flows?",
                "answer": "Los Flows son colecciones de contenido curadas creadas por nuestro equipo editorial e IA. Agrupan contenido relacionado por tema, estado de animo o evento. Encuentra Flows en la seccion Descubrir."
            }
        }
    },
    {
        "question_key": "help.faq.features.chess.question",
        "answer_key": "help.faq.features.chess.answer",
        "category": "features",
        "order": 12,
        "translations": {
            "en": {
                "question": "Can I play chess on Bayit+?",
                "answer": "Yes! Challenge friends to chess games while watching content together. Access the chess feature from the social menu during Watch Parties or from your friends list."
            },
            "he": {
                "question": "אפשר לשחק שחמט ב-Bayit+?",
                "answer": "כן! אתגרו חברים למשחקי שחמט בזמן צפייה בתוכן יחד. גשו לתכונת השחמט מהתפריט החברתי במהלך מסיבות צפייה או מרשימת החברים שלכם."
            },
            "es": {
                "question": "Puedo jugar ajedrez en Bayit+?",
                "answer": "Si! Desafia a amigos a partidas de ajedrez mientras ven contenido juntos. Accede a la funcion de ajedrez desde el menu social durante Watch Parties o desde tu lista de amigos."
            }
        }
    },
    {
        "question_key": "help.faq.features.rating.question",
        "answer_key": "help.faq.features.rating.answer",
        "category": "features",
        "order": 13,
        "translations": {
            "en": {
                "question": "How do I rate content?",
                "answer": "After watching, you'll be prompted to rate the content. You can also rate anytime from the content details page. Your ratings help improve personalized recommendations."
            },
            "he": {
                "question": "איך מדרגים תוכן?",
                "answer": "לאחר צפייה, תתבקשו לדרג את התוכן. אפשר גם לדרג בכל עת מדף פרטי התוכן. הדירוגים שלכם עוזרים לשפר המלצות מותאמות אישית."
            },
            "es": {
                "question": "Como califico el contenido?",
                "answer": "Despues de ver, se te pedira que califiques el contenido. Tambien puedes calificar en cualquier momento desde la pagina de detalles del contenido. Tus calificaciones ayudan a mejorar las recomendaciones personalizadas."
            }
        }
    },
    {
        "question_key": "help.faq.features.skip.question",
        "answer_key": "help.faq.features.skip.answer",
        "category": "features",
        "order": 14,
        "translations": {
            "en": {
                "question": "Can I skip intros and credits?",
                "answer": "Yes, 'Skip Intro' and 'Skip Credits' buttons appear when available. You can also enable auto-skip in Settings > Playback. Episodes will automatically continue to the next one."
            },
            "he": {
                "question": "אפשר לדלג על פתיחים וקרדיטים?",
                "answer": "כן, כפתורי 'דלג על פתיח' ו'דלג על קרדיטים' מופיעים כשזמינים. אפשר גם להפעיל דילוג אוטומטי בהגדרות > ניגון. פרקים ימשיכו אוטומטית לפרק הבא."
            },
            "es": {
                "question": "Puedo saltar intros y creditos?",
                "answer": "Si, los botones 'Saltar Intro' y 'Saltar Creditos' aparecen cuando estan disponibles. Tambien puedes habilitar el salto automatico en Configuracion > Reproduccion. Los episodios continuaran automaticamente al siguiente."
            }
        }
    },
    {
        "question_key": "help.faq.features.audio.question",
        "answer_key": "help.faq.features.audio.answer",
        "category": "features",
        "order": 15,
        "translations": {
            "en": {
                "question": "Can I change audio language?",
                "answer": "Yes, tap the audio icon during playback to see available audio tracks. Options vary by content. Your language preference is saved and applied to future content when available."
            },
            "he": {
                "question": "אפשר לשנות שפת אודיו?",
                "answer": "כן, הקישו על אייקון האודיו בזמן ניגון לראות רצועות אודיו זמינות. האפשרויות משתנות לפי תוכן. העדפת השפה שלכם נשמרת ומיושמת על תוכן עתידי כשזמינה."
            },
            "es": {
                "question": "Puedo cambiar el idioma del audio?",
                "answer": "Si, toca el icono de audio durante la reproduccion para ver las pistas de audio disponibles. Las opciones varian segun el contenido. Tu preferencia de idioma se guarda y se aplica al contenido futuro cuando este disponible."
            }
        }
    },
    # =============================================================================
    # KIDS (8 entries)
    # =============================================================================
    {
        "question_key": "help.faq.kids.profile.question",
        "answer_key": "help.faq.kids.profile.answer",
        "category": "kids",
        "order": 1,
        "is_featured": True,
        "translations": {
            "en": {
                "question": "How do I set up a Kids profile?",
                "answer": "Go to Profiles > Add Profile > Kids Profile. Set the child's name, age range, and avatar. Kids profiles only show age-appropriate content and have a child-friendly interface."
            },
            "he": {
                "question": "איך מגדירים פרופיל ילדים?",
                "answer": "עברו לפרופילים > הוסף פרופיל > פרופיל ילדים. הגדירו את שם הילד, טווח גילאים ואווטאר. פרופילי ילדים מציגים רק תוכן מתאים לגיל ויש להם ממשק ידידותי לילדים."
            },
            "es": {
                "question": "Como configuro un perfil de ninos?",
                "answer": "Ve a Perfiles > Agregar perfil > Perfil de ninos. Establece el nombre del nino, rango de edad y avatar. Los perfiles de ninos solo muestran contenido apropiado para la edad y tienen una interfaz amigable para ninos."
            }
        }
    },
    {
        "question_key": "help.faq.kids.pin.question",
        "answer_key": "help.faq.kids.pin.answer",
        "category": "kids",
        "order": 2,
        "translations": {
            "en": {
                "question": "How do I set up a parental PIN?",
                "answer": "Go to Settings > Parental Controls > Set PIN. This 4-digit PIN protects adult profiles and settings. You'll need it to exit Kids profiles or access restricted content."
            },
            "he": {
                "question": "איך מגדירים PIN הורים?",
                "answer": "עברו להגדרות > בקרת הורים > הגדר PIN. קוד ה-PIN בן 4 ספרות מגן על פרופילי מבוגרים והגדרות. תצטרכו אותו ליציאה מפרופילי ילדים או גישה לתוכן מוגבל."
            },
            "es": {
                "question": "Como configuro un PIN parental?",
                "answer": "Ve a Configuracion > Controles parentales > Establecer PIN. Este PIN de 4 digitos protege los perfiles de adultos y la configuracion. Lo necesitaras para salir de los perfiles de ninos o acceder a contenido restringido."
            }
        }
    },
    {
        "question_key": "help.faq.kids.screentime.question",
        "answer_key": "help.faq.kids.screentime.answer",
        "category": "kids",
        "order": 3,
        "translations": {
            "en": {
                "question": "Can I set screen time limits?",
                "answer": "Yes, go to the Kids profile settings > Screen Time. Set daily time limits and viewing schedules. Kids receive friendly warnings before time runs out."
            },
            "he": {
                "question": "אפשר להגדיר מגבלות זמן מסך?",
                "answer": "כן, עברו להגדרות פרופיל הילדים > זמן מסך. הגדירו מגבלות זמן יומיות ולוחות זמנים לצפייה. ילדים מקבלים אזהרות ידידותיות לפני שהזמן נגמר."
            },
            "es": {
                "question": "Puedo establecer limites de tiempo de pantalla?",
                "answer": "Si, ve a la configuracion del perfil de ninos > Tiempo de pantalla. Establece limites de tiempo diarios y horarios de visualizacion. Los ninos reciben advertencias amigables antes de que se acabe el tiempo."
            }
        }
    },
    {
        "question_key": "help.faq.kids.ratings.question",
        "answer_key": "help.faq.kids.ratings.answer",
        "category": "kids",
        "order": 4,
        "translations": {
            "en": {
                "question": "How do content ratings work?",
                "answer": "Content is rated by age appropriateness: All Ages, 7+, 10+, 13+, 16+, and 18+. Kids profiles automatically filter content based on the age range you set."
            },
            "he": {
                "question": "איך דירוגי תוכן עובדים?",
                "answer": "תוכן מדורג לפי התאמה לגיל: כל הגילאים, 7+, 10+, 13+, 16+, ו-18+. פרופילי ילדים מסננים תוכן אוטומטית לפי טווח הגילאים שהגדרתם."
            },
            "es": {
                "question": "Como funcionan las clasificaciones de contenido?",
                "answer": "El contenido se clasifica por idoneidad de edad: Todas las edades, 7+, 10+, 13+, 16+ y 18+. Los perfiles de ninos filtran automaticamente el contenido segun el rango de edad que establezcas."
            }
        }
    },
    {
        "question_key": "help.faq.kids.lock.question",
        "answer_key": "help.faq.kids.lock.answer",
        "category": "kids",
        "order": 5,
        "translations": {
            "en": {
                "question": "How do I lock the Kids profile?",
                "answer": "Kids profiles are automatically locked by default. Adults need to enter the parental PIN to exit to other profiles. You can also lock specific adult profiles."
            },
            "he": {
                "question": "איך נועלים את פרופיל הילדים?",
                "answer": "פרופילי ילדים נעולים אוטומטית כברירת מחדל. מבוגרים צריכים להזין את PIN ההורים כדי לעבור לפרופילים אחרים. אפשר גם לנעול פרופילי מבוגרים ספציפיים."
            },
            "es": {
                "question": "Como bloqueo el perfil de ninos?",
                "answer": "Los perfiles de ninos estan bloqueados automaticamente por defecto. Los adultos necesitan ingresar el PIN parental para salir a otros perfiles. Tambien puedes bloquear perfiles de adultos especificos."
            }
        }
    },
    {
        "question_key": "help.faq.kids.content.question",
        "answer_key": "help.faq.kids.content.answer",
        "category": "kids",
        "order": 6,
        "translations": {
            "en": {
                "question": "What content is available for kids?",
                "answer": "Kids profiles include animated movies, educational content, kids' TV shows, and family-friendly content. Our team curates safe, enriching content for all age groups."
            },
            "he": {
                "question": "איזה תוכן זמין לילדים?",
                "answer": "פרופילי ילדים כוללים סרטים מונפשים, תוכן חינוכי, תוכניות טלוויזיה לילדים ותוכן ידידותי למשפחה. הצוות שלנו אוצר תוכן בטוח ומעשיר לכל קבוצות הגיל."
            },
            "es": {
                "question": "Que contenido esta disponible para ninos?",
                "answer": "Los perfiles de ninos incluyen peliculas animadas, contenido educativo, programas de TV para ninos y contenido familiar. Nuestro equipo cura contenido seguro y enriquecedor para todos los grupos de edad."
            }
        }
    },
    {
        "question_key": "help.faq.kids.history.question",
        "answer_key": "help.faq.kids.history.answer",
        "category": "kids",
        "order": 7,
        "translations": {
            "en": {
                "question": "Can I see my child's viewing history?",
                "answer": "Yes, parents can view Kids profile viewing history from the main account settings. Go to Settings > Parental Controls > View History to see what your child has watched."
            },
            "he": {
                "question": "אפשר לראות את היסטוריית הצפייה של הילד שלי?",
                "answer": "כן, הורים יכולים לצפות בהיסטוריית הצפייה של פרופיל ילדים מהגדרות החשבון הראשי. עברו להגדרות > בקרת הורים > צפה בהיסטוריה לראות במה הילד שלכם צפה."
            },
            "es": {
                "question": "Puedo ver el historial de visualizacion de mi hijo?",
                "answer": "Si, los padres pueden ver el historial de visualizacion del perfil de ninos desde la configuracion de la cuenta principal. Ve a Configuracion > Controles parentales > Ver historial para ver lo que tu hijo ha visto."
            }
        }
    },
    {
        "question_key": "help.faq.kids.voice.question",
        "answer_key": "help.faq.kids.voice.answer",
        "category": "kids",
        "order": 8,
        "translations": {
            "en": {
                "question": "Is voice control safe for kids?",
                "answer": "Yes, voice control in Kids profiles is limited to kid-friendly commands. Kids can search for content and control playback, but cannot access adult content or change parental settings."
            },
            "he": {
                "question": "האם שליטה קולית בטוחה לילדים?",
                "answer": "כן, שליטה קולית בפרופילי ילדים מוגבלת לפקודות ידידותיות לילדים. ילדים יכולים לחפש תוכן ולשלוט בניגון, אך לא יכולים לגשת לתוכן מבוגרים או לשנות הגדרות הורים."
            },
            "es": {
                "question": "El control por voz es seguro para los ninos?",
                "answer": "Si, el control por voz en perfiles de ninos esta limitado a comandos amigables para ninos. Los ninos pueden buscar contenido y controlar la reproduccion, pero no pueden acceder a contenido para adultos ni cambiar la configuracion parental."
            }
        }
    },
    # =============================================================================
    # JUDAISM (10 entries)
    # =============================================================================
    {
        "question_key": "help.faq.judaism.section.question",
        "answer_key": "help.faq.judaism.section.answer",
        "category": "judaism",
        "order": 1,
        "is_featured": True,
        "translations": {
            "en": {
                "question": "What is the Judaism section?",
                "answer": "The Judaism section offers Jewish content including Torah learning, holiday-related videos, Jewish music, Israeli news, community directory, and Shabbat/holiday times. It's designed for observant and cultural Jews alike."
            },
            "he": {
                "question": "מה זה קטע היהדות?",
                "answer": "קטע היהדות מציע תוכן יהודי כולל לימוד תורה, סרטונים הקשורים לחגים, מוזיקה יהודית, חדשות ישראליות, מדריך קהילה וזמני שבת/חג. הוא מיועד ליהודים שומרי מצוות ותרבותיים כאחד."
            },
            "es": {
                "question": "Que es la seccion de Judaismo?",
                "answer": "La seccion de Judaismo ofrece contenido judio que incluye estudio de Tora, videos relacionados con festividades, musica judia, noticias de Israel, directorio comunitario y horarios de Shabat/festividades. Esta disenada tanto para judios observantes como culturales."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.shabbat.question",
        "answer_key": "help.faq.judaism.shabbat.answer",
        "category": "judaism",
        "order": 2,
        "translations": {
            "en": {
                "question": "What is Shabbat Mode?",
                "answer": "Shabbat Mode automatically adjusts the app based on Shabbat times for your location. It can display pre-downloaded content, disable certain features, and show Shabbat-appropriate content."
            },
            "he": {
                "question": "מה זה מצב שבת?",
                "answer": "מצב שבת מתאים אוטומטית את האפליקציה לפי זמני שבת למיקום שלכם. הוא יכול להציג תוכן שהורד מראש, להשבית תכונות מסוימות ולהציג תוכן מתאים לשבת."
            },
            "es": {
                "question": "Que es el Modo Shabat?",
                "answer": "El Modo Shabat ajusta automaticamente la aplicacion segun los horarios de Shabat para tu ubicacion. Puede mostrar contenido pre-descargado, deshabilitar ciertas funciones y mostrar contenido apropiado para Shabat."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.calendar.question",
        "answer_key": "help.faq.judaism.calendar.answer",
        "category": "judaism",
        "order": 3,
        "translations": {
            "en": {
                "question": "How does the Jewish calendar work?",
                "answer": "The Jewish calendar widget shows today's Hebrew date, upcoming holidays, and parasha of the week. It syncs with your location for accurate holiday times and sunrise/sunset."
            },
            "he": {
                "question": "איך לוח השנה היהודי עובד?",
                "answer": "ווידג'ט לוח השנה היהודי מציג את התאריך העברי של היום, חגים קרובים ופרשת השבוע. הוא מסונכרן עם המיקום שלכם לזמני חג וזריחה/שקיעה מדויקים."
            },
            "es": {
                "question": "Como funciona el calendario judio?",
                "answer": "El widget del calendario judio muestra la fecha hebrea de hoy, las proximas festividades y la parasha de la semana. Se sincroniza con tu ubicacion para horarios precisos de festividades y amanecer/atardecer."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.zmanim.question",
        "answer_key": "help.faq.judaism.zmanim.answer",
        "category": "judaism",
        "order": 4,
        "translations": {
            "en": {
                "question": "What are Zmanim?",
                "answer": "Zmanim are halachic times based on your location, including sunrise, sunset, candle lighting, Havdalah, and prayer times. Enable location services for accurate times."
            },
            "he": {
                "question": "מה זה זמנים?",
                "answer": "זמנים הם זמנים הלכתיים לפי המיקום שלכם, כולל זריחה, שקיעה, הדלקת נרות, הבדלה וזמני תפילה. הפעילו שירותי מיקום לזמנים מדויקים."
            },
            "es": {
                "question": "Que son los Zmanim?",
                "answer": "Zmanim son horarios halajicos basados en tu ubicacion, incluyendo amanecer, atardecer, encendido de velas, Havdala y horarios de oracion. Habilita los servicios de ubicacion para horarios precisos."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.dafyomi.question",
        "answer_key": "help.faq.judaism.dafyomi.answer",
        "category": "judaism",
        "order": 5,
        "translations": {
            "en": {
                "question": "Does Bayit+ have Daf Yomi content?",
                "answer": "Yes, we feature daily Daf Yomi shiurim from various teachers. Access it from the Judaism section > Torah Learning > Daf Yomi. New content is added daily."
            },
            "he": {
                "question": "האם ל-Bayit+ יש תוכן דף יומי?",
                "answer": "כן, אנו מציגים שיעורי דף יומי מרבנים שונים מדי יום. גשו אליו מקטע היהדות > לימוד תורה > דף יומי. תוכן חדש מתווסף מדי יום."
            },
            "es": {
                "question": "Bayit+ tiene contenido de Daf Yomi?",
                "answer": "Si, presentamos shiurim de Daf Yomi diarios de varios maestros. Accede desde la seccion Judaismo > Estudio de Tora > Daf Yomi. Se agrega contenido nuevo diariamente."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.community.question",
        "answer_key": "help.faq.judaism.community.answer",
        "category": "judaism",
        "order": 6,
        "translations": {
            "en": {
                "question": "How do I find local Jewish organizations?",
                "answer": "Use the Community Directory in the Judaism section to find nearby synagogues, kosher restaurants, mikvaot, and Jewish organizations. Search by location or browse by category."
            },
            "he": {
                "question": "איך מוצאים ארגונים יהודיים מקומיים?",
                "answer": "השתמשו במדריך הקהילה בקטע היהדות למציאת בתי כנסת, מסעדות כשרות, מקוואות וארגונים יהודיים בסביבה. חפשו לפי מיקום או דפדפו לפי קטגוריה."
            },
            "es": {
                "question": "Como encuentro organizaciones judias locales?",
                "answer": "Usa el Directorio de la Comunidad en la seccion de Judaismo para encontrar sinagogas cercanas, restaurantes kosher, mikvaot y organizaciones judias. Busca por ubicacion o explora por categoria."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.morning.question",
        "answer_key": "help.faq.judaism.morning.answer",
        "category": "judaism",
        "order": 7,
        "translations": {
            "en": {
                "question": "What is the Morning Ritual?",
                "answer": "The Morning Ritual is a personalized daily experience including weather, Israeli news highlights, Torah thought of the day, and curated content recommendations to start your day."
            },
            "he": {
                "question": "מה זה הטקס הבוקר?",
                "answer": "טקס הבוקר הוא חוויה יומית מותאמת אישית הכוללת מזג אוויר, עיקרי החדשות מישראל, דבר תורה יומי והמלצות תוכן אצורות להתחלת היום שלכם."
            },
            "es": {
                "question": "Que es el Ritual Matutino?",
                "answer": "El Ritual Matutino es una experiencia diaria personalizada que incluye el clima, aspectos destacados de noticias de Israel, pensamiento de Tora del dia y recomendaciones de contenido curadas para comenzar tu dia."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.holidays.question",
        "answer_key": "help.faq.judaism.holidays.answer",
        "category": "judaism",
        "order": 8,
        "translations": {
            "en": {
                "question": "Is there holiday-specific content?",
                "answer": "Yes, we curate special content for all Jewish holidays including videos, music, shiurim, and family-friendly programming. Holiday content is highlighted automatically."
            },
            "he": {
                "question": "האם יש תוכן ספציפי לחגים?",
                "answer": "כן, אנו אוצרים תוכן מיוחד לכל החגים היהודיים כולל סרטונים, מוזיקה, שיעורים ותכנות ידידותית למשפחה. תוכן חג מודגש אוטומטית."
            },
            "es": {
                "question": "Hay contenido especifico para festividades?",
                "answer": "Si, curamos contenido especial para todas las festividades judias incluyendo videos, musica, shiurim y programacion familiar. El contenido de festividades se destaca automaticamente."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.kosher.question",
        "answer_key": "help.faq.judaism.kosher.answer",
        "category": "judaism",
        "order": 9,
        "translations": {
            "en": {
                "question": "Is all content on Bayit+ kosher?",
                "answer": "While not all content is religious, we offer comprehensive filtering options. Enable 'Kosher Mode' in settings to hide content that may not meet religious standards."
            },
            "he": {
                "question": "האם כל התוכן ב-Bayit+ כשר?",
                "answer": "בעוד שלא כל התוכן דתי, אנו מציעים אפשרויות סינון מקיפות. הפעילו 'מצב כשר' בהגדרות להסתרת תוכן שעשוי לא לעמוד בסטנדרטים דתיים."
            },
            "es": {
                "question": "Todo el contenido en Bayit+ es kosher?",
                "answer": "Aunque no todo el contenido es religioso, ofrecemos opciones de filtrado completas. Habilita el 'Modo Kosher' en configuracion para ocultar contenido que puede no cumplir con los estandares religiosos."
            }
        }
    },
    {
        "question_key": "help.faq.judaism.israel.question",
        "answer_key": "help.faq.judaism.israel.answer",
        "category": "judaism",
        "order": 10,
        "translations": {
            "en": {
                "question": "Is there Israeli content?",
                "answer": "Yes, we feature Israeli news, Israeli TV channels, Israeli movies, and content about Israel including Jerusalem and Tel Aviv focused programming."
            },
            "he": {
                "question": "האם יש תוכן ישראלי?",
                "answer": "כן, אנו מציגים חדשות ישראליות, ערוצי טלוויזיה ישראליים, סרטים ישראליים ותוכן על ישראל כולל תכנות ממוקדת ירושלים ותל אביב."
            },
            "es": {
                "question": "Hay contenido israeli?",
                "answer": "Si, presentamos noticias israelies, canales de TV israelies, peliculas israelies y contenido sobre Israel incluyendo programacion enfocada en Jerusalen y Tel Aviv."
            }
        }
    },
    # =============================================================================
    # ACCOUNT (8 entries)
    # =============================================================================
    {
        "question_key": "help.faq.account.password.question",
        "answer_key": "help.faq.account.password.answer",
        "category": "account",
        "order": 1,
        "translations": {
            "en": {
                "question": "How do I change my password?",
                "answer": "Go to Account Settings > Security > Change Password. Enter your current password and create a new one. You'll be signed out of other devices for security."
            },
            "he": {
                "question": "איך משנים את הסיסמה?",
                "answer": "עברו להגדרות חשבון > אבטחה > שינוי סיסמה. הזינו את הסיסמה הנוכחית וצרו חדשה. תתנתקו ממכשירים אחרים לצורכי אבטחה."
            },
            "es": {
                "question": "Como cambio mi contrasena?",
                "answer": "Ve a Configuracion de cuenta > Seguridad > Cambiar contrasena. Ingresa tu contrasena actual y crea una nueva. Se cerrara la sesion en otros dispositivos por seguridad."
            }
        }
    },
    {
        "question_key": "help.faq.account.email.question",
        "answer_key": "help.faq.account.email.answer",
        "category": "account",
        "order": 2,
        "translations": {
            "en": {
                "question": "How do I change my email address?",
                "answer": "Go to Account Settings > Profile > Change Email. You'll receive a verification email at your new address. Confirm it to complete the change."
            },
            "he": {
                "question": "איך משנים את כתובת האימייל?",
                "answer": "עברו להגדרות חשבון > פרופיל > שינוי אימייל. תקבלו אימייל אימות לכתובת החדשה שלכם. אשרו אותו להשלמת השינוי."
            },
            "es": {
                "question": "Como cambio mi direccion de correo electronico?",
                "answer": "Ve a Configuracion de cuenta > Perfil > Cambiar correo electronico. Recibiras un correo de verificacion en tu nueva direccion. Confirmalo para completar el cambio."
            }
        }
    },
    {
        "question_key": "help.faq.account.delete.question",
        "answer_key": "help.faq.account.delete.answer",
        "category": "account",
        "order": 3,
        "translations": {
            "en": {
                "question": "How do I delete my account?",
                "answer": "Go to Account Settings > Privacy > Delete Account. This permanently removes all your data including profiles, history, and preferences. Active subscriptions will be cancelled."
            },
            "he": {
                "question": "איך מוחקים את החשבון?",
                "answer": "עברו להגדרות חשבון > פרטיות > מחיקת חשבון. זה מסיר לצמיתות את כל הנתונים שלכם כולל פרופילים, היסטוריה והעדפות. מנויים פעילים יבוטלו."
            },
            "es": {
                "question": "Como elimino mi cuenta?",
                "answer": "Ve a Configuracion de cuenta > Privacidad > Eliminar cuenta. Esto elimina permanentemente todos tus datos incluyendo perfiles, historial y preferencias. Las suscripciones activas seran canceladas."
            }
        }
    },
    {
        "question_key": "help.faq.account.devices.question",
        "answer_key": "help.faq.account.devices.answer",
        "category": "account",
        "order": 4,
        "translations": {
            "en": {
                "question": "How do I manage my connected devices?",
                "answer": "Go to Account Settings > Devices to see all signed-in devices. You can rename devices, sign out individual devices, or sign out all devices at once."
            },
            "he": {
                "question": "איך מנהלים את המכשירים המחוברים?",
                "answer": "עברו להגדרות חשבון > מכשירים לראות את כל המכשירים המחוברים. אפשר לשנות שמות מכשירים, להתנתק ממכשירים בודדים או להתנתק מכל המכשירים בבת אחת."
            },
            "es": {
                "question": "Como administro mis dispositivos conectados?",
                "answer": "Ve a Configuracion de cuenta > Dispositivos para ver todos los dispositivos conectados. Puedes renombrar dispositivos, cerrar sesion en dispositivos individuales o cerrar sesion en todos los dispositivos a la vez."
            }
        }
    },
    {
        "question_key": "help.faq.account.2fa.question",
        "answer_key": "help.faq.account.2fa.answer",
        "category": "account",
        "order": 5,
        "translations": {
            "en": {
                "question": "How do I enable two-factor authentication?",
                "answer": "Go to Account Settings > Security > Two-Factor Authentication. Choose SMS or authenticator app. This adds an extra layer of security when signing in."
            },
            "he": {
                "question": "איך מפעילים אימות דו-שלבי?",
                "answer": "עברו להגדרות חשבון > אבטחה > אימות דו-שלבי. בחרו SMS או אפליקציית מאמת. זה מוסיף שכבת אבטחה נוספת בעת התחברות."
            },
            "es": {
                "question": "Como habilito la autenticacion de dos factores?",
                "answer": "Ve a Configuracion de cuenta > Seguridad > Autenticacion de dos factores. Elige SMS o aplicacion de autenticacion. Esto agrega una capa adicional de seguridad al iniciar sesion."
            }
        }
    },
    {
        "question_key": "help.faq.account.forgot.question",
        "answer_key": "help.faq.account.forgot.answer",
        "category": "account",
        "order": 6,
        "translations": {
            "en": {
                "question": "I forgot my password. What do I do?",
                "answer": "Click 'Forgot Password' on the login screen and enter your email. You'll receive a reset link. If you don't receive it, check spam or contact support."
            },
            "he": {
                "question": "שכחתי את הסיסמה. מה לעשות?",
                "answer": "לחצו על 'שכחתי סיסמה' במסך ההתחברות והזינו את האימייל שלכם. תקבלו קישור לאיפוס. אם לא מקבלים, בדקו בדואר זבל או פנו לתמיכה."
            },
            "es": {
                "question": "Olvide mi contrasena. Que hago?",
                "answer": "Haz clic en 'Olvide mi contrasena' en la pantalla de inicio de sesion e ingresa tu correo electronico. Recibiras un enlace de restablecimiento. Si no lo recibes, revisa spam o contacta al soporte."
            }
        }
    },
    {
        "question_key": "help.faq.account.notifications.question",
        "answer_key": "help.faq.account.notifications.answer",
        "category": "account",
        "order": 7,
        "translations": {
            "en": {
                "question": "How do I manage notification preferences?",
                "answer": "Go to Account Settings > Notifications. Control email, push, and in-app notifications separately. You can set preferences for new content, recommendations, and account updates."
            },
            "he": {
                "question": "איך מנהלים העדפות התראות?",
                "answer": "עברו להגדרות חשבון > התראות. שלטו באימייל, התראות דחיפה והתראות באפליקציה בנפרד. אפשר להגדיר העדפות לתוכן חדש, המלצות ועדכוני חשבון."
            },
            "es": {
                "question": "Como administro las preferencias de notificacion?",
                "answer": "Ve a Configuracion de cuenta > Notificaciones. Controla correo electronico, notificaciones push y notificaciones en la aplicacion por separado. Puedes establecer preferencias para contenido nuevo, recomendaciones y actualizaciones de cuenta."
            }
        }
    },
    {
        "question_key": "help.faq.account.privacy.question",
        "answer_key": "help.faq.account.privacy.answer",
        "category": "account",
        "order": 8,
        "translations": {
            "en": {
                "question": "How can I control my privacy settings?",
                "answer": "Go to Account Settings > Privacy. Control viewing history visibility, data sharing preferences, and personalization settings. You can also download or delete your data."
            },
            "he": {
                "question": "איך אפשר לשלוט בהגדרות הפרטיות?",
                "answer": "עברו להגדרות חשבון > פרטיות. שלטו בנראות היסטוריית צפייה, העדפות שיתוף נתונים והגדרות התאמה אישית. אפשר גם להוריד או למחוק את הנתונים שלכם."
            },
            "es": {
                "question": "Como puedo controlar mi configuracion de privacidad?",
                "answer": "Ve a Configuracion de cuenta > Privacidad. Controla la visibilidad del historial de visualizacion, preferencias de intercambio de datos y configuracion de personalizacion. Tambien puedes descargar o eliminar tus datos."
            }
        }
    },
    # =============================================================================
    # TROUBLESHOOTING (7 entries)
    # =============================================================================
    {
        "question_key": "help.faq.troubleshooting.notworking.question",
        "answer_key": "help.faq.troubleshooting.notworking.answer",
        "category": "troubleshooting",
        "order": 1,
        "is_featured": True,
        "translations": {
            "en": {
                "question": "The app isn't working. What should I do?",
                "answer": "Try these steps: 1) Check your internet connection, 2) Close and reopen the app, 3) Update to the latest version, 4) Restart your device, 5) Clear app cache in settings. If issues persist, contact support."
            },
            "he": {
                "question": "האפליקציה לא עובדת. מה לעשות?",
                "answer": "נסו את הצעדים הבאים: 1) בדקו את חיבור האינטרנט, 2) סגרו ופתחו מחדש את האפליקציה, 3) עדכנו לגרסה האחרונה, 4) אתחלו את המכשיר, 5) נקו את מטמון האפליקציה בהגדרות. אם הבעיות נמשכות, פנו לתמיכה."
            },
            "es": {
                "question": "La aplicacion no funciona. Que debo hacer?",
                "answer": "Intenta estos pasos: 1) Verifica tu conexion a internet, 2) Cierra y vuelve a abrir la aplicacion, 3) Actualiza a la ultima version, 4) Reinicia tu dispositivo, 5) Limpia la cache de la aplicacion en configuracion. Si los problemas persisten, contacta al soporte."
            }
        }
    },
    {
        "question_key": "help.faq.troubleshooting.blackscreen.question",
        "answer_key": "help.faq.troubleshooting.blackscreen.answer",
        "category": "troubleshooting",
        "order": 2,
        "translations": {
            "en": {
                "question": "I see a black screen when playing video.",
                "answer": "This is usually caused by browser extensions, VPN, or hardware acceleration. Try: disabling ad blockers, turning off VPN, disabling hardware acceleration in settings, or using a different browser."
            },
            "he": {
                "question": "אני רואה מסך שחור בזמן ניגון וידאו.",
                "answer": "זה בדרך כלל נגרם על ידי הרחבות דפדפן, VPN או האצת חומרה. נסו: לבטל חוסמי פרסומות, לכבות VPN, לבטל האצת חומרה בהגדרות או להשתמש בדפדפן אחר."
            },
            "es": {
                "question": "Veo una pantalla negra al reproducir video.",
                "answer": "Esto generalmente es causado por extensiones del navegador, VPN o aceleracion de hardware. Intenta: deshabilitar bloqueadores de anuncios, apagar VPN, deshabilitar la aceleracion de hardware en configuracion, o usar un navegador diferente."
            }
        }
    },
    {
        "question_key": "help.faq.troubleshooting.nosound.question",
        "answer_key": "help.faq.troubleshooting.nosound.answer",
        "category": "troubleshooting",
        "order": 3,
        "translations": {
            "en": {
                "question": "There's no sound when I play content.",
                "answer": "Check: 1) Device volume and mute settings, 2) Bayit+ volume control in the player, 3) Try different content to rule out specific issues, 4) Check audio output settings on your device, 5) Restart the app."
            },
            "he": {
                "question": "אין צליל כשאני מנגן תוכן.",
                "answer": "בדקו: 1) עוצמת קול המכשיר והגדרות השתקה, 2) בקרת עוצמת קול Bayit+ בנגן, 3) נסו תוכן אחר לשלילת בעיות ספציפיות, 4) בדקו הגדרות יציאת אודיו במכשיר, 5) אתחלו את האפליקציה."
            },
            "es": {
                "question": "No hay sonido cuando reproduzco contenido.",
                "answer": "Verifica: 1) Volumen del dispositivo y configuracion de silencio, 2) Control de volumen de Bayit+ en el reproductor, 3) Prueba contenido diferente para descartar problemas especificos, 4) Verifica la configuracion de salida de audio en tu dispositivo, 5) Reinicia la aplicacion."
            }
        }
    },
    {
        "question_key": "help.faq.troubleshooting.cantlogin.question",
        "answer_key": "help.faq.troubleshooting.cantlogin.answer",
        "category": "troubleshooting",
        "order": 4,
        "translations": {
            "en": {
                "question": "I can't log in to my account.",
                "answer": "Try: 1) Reset your password using 'Forgot Password', 2) Check if caps lock is on, 3) Clear browser cookies, 4) Try a different browser or device, 5) If using social login, ensure that account is active."
            },
            "he": {
                "question": "אני לא מצליח להתחבר לחשבון.",
                "answer": "נסו: 1) לאפס את הסיסמה באמצעות 'שכחתי סיסמה', 2) לבדוק אם caps lock דולק, 3) לנקות עוגיות דפדפן, 4) לנסות דפדפן או מכשיר אחר, 5) אם משתמשים בהתחברות חברתית, ודאו שהחשבון פעיל."
            },
            "es": {
                "question": "No puedo iniciar sesion en mi cuenta.",
                "answer": "Intenta: 1) Restablecer tu contrasena usando 'Olvide mi contrasena', 2) Verificar si el bloqueo de mayusculas esta activado, 3) Limpiar las cookies del navegador, 4) Probar un navegador o dispositivo diferente, 5) Si usas inicio de sesion social, asegurate de que esa cuenta este activa."
            }
        }
    },
    {
        "question_key": "help.faq.troubleshooting.error.question",
        "answer_key": "help.faq.troubleshooting.error.answer",
        "category": "troubleshooting",
        "order": 5,
        "translations": {
            "en": {
                "question": "I'm getting an error message. What do the codes mean?",
                "answer": "Error codes help identify issues: E001-E010 are login errors, E011-E020 are playback errors, E021-E030 are network errors, E031-E040 are payment errors. Check our Error Codes documentation for specific fixes."
            },
            "he": {
                "question": "אני מקבל הודעת שגיאה. מה משמעות הקודים?",
                "answer": "קודי שגיאה עוזרים לזהות בעיות: E001-E010 הן שגיאות התחברות, E011-E020 הן שגיאות ניגון, E021-E030 הן שגיאות רשת, E031-E040 הן שגיאות תשלום. בדקו את תיעוד קודי השגיאה שלנו לתיקונים ספציפיים."
            },
            "es": {
                "question": "Estoy recibiendo un mensaje de error. Que significan los codigos?",
                "answer": "Los codigos de error ayudan a identificar problemas: E001-E010 son errores de inicio de sesion, E011-E020 son errores de reproduccion, E021-E030 son errores de red, E031-E040 son errores de pago. Consulta nuestra documentacion de Codigos de Error para correcciones especificas."
            }
        }
    },
    {
        "question_key": "help.faq.troubleshooting.slow.question",
        "answer_key": "help.faq.troubleshooting.slow.answer",
        "category": "troubleshooting",
        "order": 6,
        "translations": {
            "en": {
                "question": "The app is running slowly.",
                "answer": "Try: 1) Clear app cache in Settings > Storage > Clear Cache, 2) Close other apps, 3) Restart your device, 4) Check available storage space, 5) Reinstall the app if issues persist."
            },
            "he": {
                "question": "האפליקציה רצה לאט.",
                "answer": "נסו: 1) לנקות מטמון אפליקציה בהגדרות > אחסון > ניקוי מטמון, 2) לסגור אפליקציות אחרות, 3) לאתחל את המכשיר, 4) לבדוק מקום אחסון זמין, 5) להתקין מחדש את האפליקציה אם הבעיות נמשכות."
            },
            "es": {
                "question": "La aplicacion esta funcionando lentamente.",
                "answer": "Intenta: 1) Limpiar la cache de la aplicacion en Configuracion > Almacenamiento > Limpiar cache, 2) Cerrar otras aplicaciones, 3) Reiniciar tu dispositivo, 4) Verificar el espacio de almacenamiento disponible, 5) Reinstalar la aplicacion si los problemas persisten."
            }
        }
    },
    {
        "question_key": "help.faq.troubleshooting.voice.question",
        "answer_key": "help.faq.troubleshooting.voice.answer",
        "category": "troubleshooting",
        "order": 7,
        "translations": {
            "en": {
                "question": "Voice control isn't recognizing my commands.",
                "answer": "Ensure: 1) Microphone permission is granted, 2) You're speaking clearly in a supported language, 3) Background noise is minimal, 4) The correct wake word ('Hey Bayit') is used, 5) Check microphone in device settings."
            },
            "he": {
                "question": "שליטה קולית לא מזהה את הפקודות שלי.",
                "answer": "ודאו: 1) הרשאת מיקרופון ניתנה, 2) אתם מדברים בבהירות בשפה נתמכת, 3) רעשי רקע מינימליים, 4) מילת ההפעלה הנכונה ('היי בית') בשימוש, 5) בדקו מיקרופון בהגדרות המכשיר."
            },
            "es": {
                "question": "El control por voz no reconoce mis comandos.",
                "answer": "Asegurate de: 1) El permiso del microfono esta otorgado, 2) Estas hablando claramente en un idioma compatible, 3) El ruido de fondo es minimo, 4) Se usa la palabra de activacion correcta ('Hey Bayit'), 5) Verifica el microfono en la configuracion del dispositivo."
            }
        }
    }
]


async def seed_faq():
    """Seed the FAQ entries in the database."""
    logger.info("Starting FAQ seeding...")

    # Connect to MongoDB
    await connect_to_mongo()

    try:
        # Clear existing FAQ entries (optional - remove if you want to keep existing)
        existing_count = await FAQEntry.count()
        if existing_count > 0:
            logger.info(f"Found {existing_count} existing FAQ entries, deleting...")
            await FAQEntry.delete_all()

        # Insert new FAQ entries
        entries_created = 0
        for faq_data in FAQ_DATA:
            entry = FAQEntry(
                question_key=faq_data["question_key"],
                answer_key=faq_data["answer_key"],
                category=faq_data["category"],
                translations=faq_data["translations"],
                order=faq_data["order"],
                is_featured=faq_data.get("is_featured", False),
                is_active=True,
                views=0,
                helpful_yes=0,
                helpful_no=0,
            )
            await entry.insert()
            entries_created += 1

            if entries_created % 10 == 0:
                logger.info(f"Created {entries_created} FAQ entries...")

        logger.info(f"FAQ seeding complete! Created {entries_created} entries.")

        # Verify counts by category
        categories = {}
        all_entries = await FAQEntry.find_all().to_list()
        for entry in all_entries:
            cat = entry.category
            categories[cat] = categories.get(cat, 0) + 1

        logger.info("FAQ entries by category:")
        for cat, count in sorted(categories.items()):
            logger.info(f"  {cat}: {count}")

    except Exception as e:
        logger.error(f"Error seeding FAQ: {e}")
        raise

    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed_faq())
