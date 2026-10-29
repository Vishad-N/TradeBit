import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/notfound.css';

// Catch-all page for any address the router does not know. The TV is pure decoration, so it is hidden from screen readers.
export default function NotFound() {
  const navigate = useNavigate();

  // A missing page should not be indexed. Put the title and robots tag back when the visitor moves on.
  useEffect(() => {
    const prevTitle = document.title;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    document.title = 'Page not found | TradeBit India';
    return () => { document.title = prevTitle; meta.remove(); };
  }, []);

  // Only offer "Go back" when there is somewhere in this tab's history to go back to.
  const canGoBack = window.history.state?.idx > 0;

  return (
    <section className="nf" aria-labelledby="nf-title">
      <div className="nf-tv" aria-hidden="true">
        <div className="main_wrapper">
          <div className="main">
            <div className="antenna">
              <div className="antenna_shadow"></div>
              <div className="a1"></div>
              <div className="a1d"></div>
              <div className="a2"></div>
              <div className="a2d"></div>
              <div className="a_base"></div>
            </div>
            <div className="tv">
              <div className="cruve">
                <svg className="curve_svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 189.929 189.929" xmlSpace="preserve">
                  <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
                </svg>
              </div>
              <div className="display_div">
                <div className="screen_out">
                  <div className="screen_out1">
                    <div className="screen"><span className="notfound_text"> NOT FOUND</span></div>
                    <div className="screenM"><span className="notfound_text"> NOT FOUND</span></div>
                  </div>
                </div>
              </div>
              <div className="lines">
                <div className="line1"></div>
                <div className="line2"></div>
                <div className="line3"></div>
              </div>
              <div className="buttons_div">
                <div className="b1"><div></div></div>
                <div className="b2"></div>
                <div className="speakers">
                  <div className="g1">
                    <div className="g11"></div>
                    <div className="g12"></div>
                    <div className="g13"></div>
                  </div>
                  <div className="g"></div>
                  <div className="g"></div>
                </div>
              </div>
            </div>
            <div className="bottom">
              <div className="base1"></div>
              <div className="base2"></div>
              <div className="base3"></div>
            </div>
          </div>
          <div className="text_404">
            <div className="text_4041">4</div>
            <div className="text_4042">0</div>
            <div className="text_4043">4</div>
          </div>
        </div>
      </div>

      <div className="nf-copy">
        <h1 id="nf-title" className="nf-title">Page not found</h1>
        <p>The page you are looking for does not exist or has moved. Let's get you back on track.</p>
        <div className="nf-actions">
          <Link className="btn btn-lime" to="/">Back to home <span className="ar">→</span></Link>
          <Link className="btn btn-dark" to="/courses">Browse courses</Link>
          {canGoBack && <button type="button" className="nf-back" onClick={() => navigate(-1)}>Go back</button>}
        </div>
      </div>
    </section>
  );
}
