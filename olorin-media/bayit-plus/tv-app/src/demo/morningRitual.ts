/**
 * DEMO-ONLY: Demo morning ritual data for testing personalized morning content.
 * Not used in production.
 */

export const demoMorningRitual = {
  is_ritual_time: false,
  reason: 'outside_time_window',
  auto_play: true,
  playlist: [
    {
      id: 'ritual-news',
      type: 'live',
      title: 'חדשות הבוקר',
      channel_id: 'kan11',
      duration: 300,
      order: 1,
    },
    {
      id: 'ritual-radio',
      type: 'radio',
      title: 'גלגלצ בבוקר',
      station_id: 'glglz',
      duration: 600,
      order: 2,
    },
    {
      id: 'ritual-podcast',
      type: 'podcast',
      title: 'סדנא לחדשות - פרק היום',
      podcast_id: 'podcast-4',
      episode_id: 'ep-4-1',
      duration: 1800,
      order: 3,
    },
  ],
  ai_brief: {
    headline: 'בוקר טוב! הנה מה שקורה היום בישראל',
    summary: 'הבחירות ממשיכות להעסיק, מכבי ניצחה, וגשם בדרך',
    top_stories: [
      'סקרים חדשים לקראת הבחירות',
      'מכבי ת"א בליגת האלופות',
      'מזג אוויר סוער בסוף השבוע',
    ],
    personalized_note: 'היום יש לך התראות על תוכן חדש מפאודה',
    generated_at: new Date().toISOString(),
  },
  israel_context: {
    weather: 'שמשי, 18°C בתל אביב',
    headline_news: 'הבחירות בעיצומן',
    trending_show: 'פאודה עונה 4',
    local_time: '08:30',
  },
};
