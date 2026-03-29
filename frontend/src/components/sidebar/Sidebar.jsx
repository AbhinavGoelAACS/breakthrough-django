import React, { useState, useEffect } from 'react';
import acsApi, { apiService } from '../../api/apiService.js';
import './Sidebar.css';

const Sidebar = () => {
  const [latestArticles, setLatestArticles] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const fetchSidebarData = async () => {
    try {
      setLoading(true);
      // Try to fetch data from API
      const articlesData = await apiService.get('articles/latest/');
      const newsData = await apiService.get('news/latest/');
      setLatestArticles(articlesData);
      setNews(newsData);
    } catch (err) {
      console.error('Error fetching sidebar data:', err);
      // Fallback to static data
      setLatestArticles(getStaticArticles());
      setNews(getStaticNews());
    } finally {
      setLoading(false);
    }
  };

  const getStaticArticles = () => {
    return [
      { id: 1, title: 'Recent Research in Mathematical Sciences', date: '2024-02-10' },
      { id: 2, title: 'Advances in Applied Sciences', date: '2024-02-08' },
      { id: 3, title: 'Operations Research Developments', date: '2024-02-05' },
      { id: 4, title: 'Fluid Mechanics Studies', date: '2024-02-03' }
    ];
  };

  const getStaticNews = () => {
    return [
      { id: 1, title: 'Breakthrough Publishers India Journal Rankings Updated', date: '2024-02-12' },
      { id: 2, title: 'New Editorial Board Members', date: '2024-02-09' },
      { id: 3, title: 'Call for Special Issues', date: '2024-02-06' },
      { id: 4, title: 'Conference Announcements', date: '2024-02-04' }
    ];
  };

  return (
    <>
      <style>
        {`
          #newscont {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            margin-bottom: 20px;
            overflow: hidden;
          }
          
          #txt {
            display: block;
            background-color: var(--primary-color);
            color: white;
            padding: 8px 12px;
            font-weight: bold;
          }
          
          #sp {
            font-size: 14px;
          }
          
          .sidebar-content {
            padding: 15px;
            height: 235px;
            overflow-y: auto;
            background-color: white;
          }
          
          .article-item, .news-item {
            border-bottom: 1px solid #eee;
            padding: 8px 0;
            cursor: pointer;
          }
          
          .article-item:hover, .news-item:hover {
            background-color: #f8f9fa;
          }
          
          .article-item:last-child, .news-item:last-child {
            border-bottom: none;
          }
          
          .item-title {
            font-size: 13px;
            color: #333;
            line-height: 1.3;
            margin-bottom: 3px;
          }
          
          .item-date {
            font-size: 11px;
            color: #666;
          }
          
          #uptodt {
            padding: 15px;
            background-color: white;
          }
          
          #uptodt ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          #uptodt li {
            padding: 8px 0 8px 30px;
            margin-bottom: 8px;
            background-repeat: no-repeat;
            background-position: left center;
            background-size: 20px 20px;
          }
          
          #uptodt a {
            color: #333;
            text-decoration: none;
            font-size: 13px;
          }
          
          #uptodt a:hover {
            color: #C01F25;
          }
          
          .loading-spinner {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100px;
          }
          
          .articles-news-container {
            display: flex;
            gap: 20px;
            width: 100%;
          }
          
          .articles-section, .news-section {
            flex: 1;
            min-width: 0;
          }
          
          @media (max-width: 768px) {
            .articles-news-container {
              flex-direction: column;
              gap: 20px;
            }
          }
        `}
      </style>

      <div style={{ width: '100%' }}>
        <div className="articles-news-container">
          {/* Latest Articles Section */}
          <div className="articles-section">
            <div id="newscont">
              <span id="txt">
                <div id="sp">Latest Articles</div>
              </span>
              <div className="sidebar-content">
                {loading ? (
                  <div className="loading-spinner">
                    <div className="spinner-border spinner-border-sm text-danger" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                  </div>
                ) : (
                  latestArticles.map((article) => (
                    <div key={article.id} className="article-item">
                      <div className="item-title">{article.title}</div>
                      <div className="item-date">{article.date}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* News Section */}
          <div className="news-section">
            <div id="newscont">
              <span id="txt">
                <div id="sp">News</div>
              </span>
              <div className="sidebar-content">
                {loading ? (
                  <div className="loading-spinner">
                    <div className="spinner-border spinner-border-sm text-danger" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                  </div>
                ) : (
                  news.map((newsItem) => (
                    <div key={newsItem.id} className="news-item">
                      <div className="item-title">{newsItem.title}</div>
                      <div className="item-date">{newsItem.date}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>


      </div>
    </>
  );
};

export default Sidebar;