export const JOURNAL_LIST_CONSTANTS = {
  STATIC_JOURNALS: [
    {
      id: 1,
      title: 'ITMSC',
      fullName: 'International Transactions in Mathematical Sciences and Computer',
      description: 'Mathematical Sciences and Computer research journal',
      url: '?journal=itmsc'
    },
    {
      id: 2,
      title: 'ITAS',
      fullName: 'International Transactions in Applied Sciences',
      description: 'Applied Sciences research journal',
      url: '?journal=itas'
    },
    {
      id: 3,
      title: 'IJICM',
      fullName: 'International Journal of Inventory Control and Management',
      description: 'Inventory Control and Management journal',
      url: '?journal=ijicm'
    },
    {
      id: 4,
      title: 'IJORO',
      fullName: 'International Journal of Operations Research and Optimization',
      description: 'Operations Research and Optimization journal',
      url: '?journal=ijoro'
    },
    {
      id: 5,
      title: 'IJFM',
      fullName: 'International Journal of Fluid Mechanics',
      description: 'Fluid Mechanics research journal',
      url: '?journal=ijfm'
    },
    {
      id: 6,
      title: 'ITHSS',
      fullName: 'International Transactions in Humanities and Social Sciences',
      description: 'Humanities and Social Sciences research journal',
      url: '?journal=ithss'
    }
  ],
  API_ENDPOINT: 'journals/',
  ERROR_MESSAGE: 'Unable to load journals from API, showing static data'
};

export default JOURNAL_LIST_CONSTANTS;
