export const SIDEBAR_CONSTANTS = {
  STATIC_ARTICLES: [
    { id: 1, title: 'Recent Research in Mathematical Sciences', date: '2024-02-10' },
    { id: 2, title: 'Advances in Applied Sciences', date: '2024-02-08' },
    { id: 3, title: 'Operations Research Developments', date: '2024-02-05' },
    { id: 4, title: 'Fluid Mechanics Studies', date: '2024-02-03' }
  ],
  STATIC_NEWS: [
    { id: 1, title: 'Breakthrough Publishers India Journal Rankings Updated', date: '2024-02-12' },
    { id: 2, title: 'New Editorial Board Members', date: '2024-02-09' },
    { id: 3, title: 'Call for Special Issues', date: '2024-02-06' },
    { id: 4, title: 'Conference Announcements', date: '2024-02-04' }
  ],
  API_ARTICLES_ENDPOINT: 'articles/latest/',
  API_NEWS_ENDPOINT: 'news/latest/',
  ARTICLES_SECTION_TITLE: 'Latest Articles',
  NEWS_SECTION_TITLE: 'Latest News',
  LOADING_MESSAGE: 'Loading...',
  ERROR_MESSAGE: 'Error fetching sidebar data'
};

export default SIDEBAR_CONSTANTS;
