"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import styles from "./ConsentAndAnalytics.module.scss";

const KEY = "furniture_cookie_consent";

export function ConsentAndAnalytics() {
  const [ok, setOk] = useState(false);
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const fb = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY) === "1") setOk(true);
  }, []);

  if (!ok) {
    return (
      <div className={styles.bar} role="dialog" aria-label="Cookie">
        <p>
          Chúng tôi sử dụng cookie để cải thiện trải nghiệm của bạn. Bằng cách tiếp tục duyệt trang web này, bạn đồng ý với việc chúng tôi sử dụng cookie.
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setOk(true);
          }}
        >
          Chấp nhận
        </button>
      </div>
    );
  }

  return (
    <>
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','${ga}');`}
          </Script>
        </>
      ) : null}
      {fb ? (
        <Script id="fbpx" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fb}');fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
