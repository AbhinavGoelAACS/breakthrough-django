import React, { useState, useEffect } from 'react';
import './Carousel.css';

const Carousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 0,
      image: "https://static.aacsjournals.com/images/JOURNAL.png",
      alt: "journal1",
      title: "",
      subtitle: "",
      description: "",
      link: ""
    },
    {
      id: 1,
      image: "https://static.aacsjournals.com/images/journal07.png",
      alt: "ITMSC",
      title: "ITMSC",
      subtitle: "INTERNATIONAL TRANSACTIONS IN MATHEMATICAL SCIENCES AND COMPUTER",
      description: "The International Transactions in Mathematical Sciences and Computer (ITMSC) is an international research journal, which publishes top-level work on Mathematical and Computer sciences. ITMSC will aim basically at research papers, short communication technical papers etc...",
      link: "?journal=itmsc"
    },
    {
      id: 2,
      image: "https://static.aacsjournals.com/images/journal06.png",
      alt: "journal2",
      title: "ITAS",
      subtitle: "INTERNATIONAL TRANSACTIONS IN APPLIED SCIENCES",
      description: "The International Transactions in Applied Sciences (ITAS) is an international research journal, which publishes top-level work on applied sciences. The Journal ITAS is a direct successor of the Journal ITMSC with the aim of publishing papers in all areas of the applied science...",
      link: "?journal=itas"
    },
    {
      id: 3,
      image: "https://static.aacsjournals.com/images/journal02.png",
      alt: "journal3",
      title: "IJICM",
      subtitle: "INTERNATIONAL JOURNAL OF INVENTORY CONTROL AND MANAGEMENT",
      description: "International Transactions in Humanities and Social Sciences (ITHSS) bridges social science and humanities communities across disciplines and continents with a view to sharing information and debate with the widest possible audience...",
      link: "?journal=ijicm"
    },
    {
      id: 4,
      image: "https://static.aacsjournals.com/images/journal05.png",
      alt: "journal4",
      title: "IJORO",
      subtitle: "International Journal of Operations Research and Optimization",
      description: "Modeling and optimization have become an essential function of researchers and practitioners. New theory development in operations research and their applications in new economy and society have been limited. In the information intensive society and economy, decisions are made...",
      link: "?journal=ijoro"
    },
    {
      id: 5,
      image: "https://static.aacsjournals.com/images/journal04.png",
      alt: "journal5",
      title: "IJSFM",
      subtitle: "INTERNATIONAL JOURNAL OF STABILITY AND FLUID MECHANICS",
      description: "International Journal of Stability and Fluid Mechanics (IJSFM) ISSN (Printing): 0975-8399 || is an international research journal, which publishes top-level work on Stability and Fluid mechanics. IJSFM has offered broad coverage of the entire field of fluid mechanics...",
      link: "?journal=ijsfm"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <>
      <style>
        {`
          .slider-description {
            z-index: 50;
            position: absolute;
            bottom: 24rem;
            left: 0px;
            width: 350px;
            background: url("https://static.aacsjournals.com//images/bg_trans.png");
            height: 100px;
            padding: 10px;
            color: #000;
          }
          
          .slider-description h5 {
            font-size: 14px;
            margin: 10px 0;
            padding: 0;
            color: #FFF;
          }
          
          .slider-description h4 {
            margin: 0;
            background: #C01F25;
            font-size: 100%;
            padding: 2px 3px;
            font-family: "Trebuchet MS", Trebuchet, Arial, Verdana, sans-serif;
            text-transform: uppercase;
            text-decoration: none;
          }
          
          .carousel-container {
            position: relative;
            overflow: hidden;
          }
          
          .carousel-inner {
            position: relative;
            width: 100%;
            height: 400px;
          }
          
          .carousel-item {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
          }
          
          .carousel-item.active {
            opacity: 1;
          }
          
          .carousel-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .carousel-indicators {
            position: absolute;
            bottom: 10px;
            left: 0;
            right: 0;
            width: 100%;
            display: none;
            gap: 10px;
            justify-content: center;
            align-items: center;
          }
          
          .carousel-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: background-color 0.3s;
          }
          
          .carousel-indicator.active {
            background-color: #0D1A63;
          }
          
          .carousel-control {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            font-size: 24px;
            padding: 10px 15px;
            cursor: pointer;
            z-index: 100;
            border-radius: 0;
            transition: background-color 0.3s ease;
          }
          }
          
          .carousel-control.prev {
            left: 10px;
          }
          
          .carousel-control.next {
            right: 10px;
          }
          
          .carousel-control:hover {
            background-color: rgba(0, 0, 0, 0.8);
          }
        `}
      </style>

      <div className="d-none d-lg-block">
        <div className="row">
          <div className="col-md-12">
            <div className="container">
              <div className="carousel-container">
                <div className="carousel-inner">
                  {slides.map((slide, index) => (
                    <div
                      key={slide.id}
                      className={`carousel-item ${index === currentSlide ? 'active' : ''}`}
                    >
                      <img src={slide.image} alt={slide.alt} />
                      {slide.title && (
                        <div className="carousel-caption d-none d-md-block slider-description">
                          <h4>{slide.title}</h4>
                          <h5>{slide.subtitle}</h5>
                          <br />
                          <p>
                            {slide.description}
                            <a href={slide.link}>Read more</a>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="carousel-indicators">
                  {slides.map((_, index) => (
                    <div
                      key={index}
                      className={`carousel-indicator ${index === currentSlide ? 'active' : ''}`}
                      onClick={() => goToSlide(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Carousel;