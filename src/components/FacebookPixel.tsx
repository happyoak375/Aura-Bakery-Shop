'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import * as fbq from '@/lib/fpixel'; // Adjust path if your fpixel.ts is somewhere else!

export default function FacebookPixel() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loaded, setLoaded] = useState(false);

    // This effect listens for route changes and fires a PageView!
    useEffect(() => {
        if (loaded) {
            fbq.pageview();
        }
    }, [pathname, searchParams, loaded]);

    return (
        <>
            <Script
                id="fb-pixel"
                strategy="afterInteractive"
                onLoad={() => setLoaded(true)}
                dangerouslySetInnerHTML={{
                    __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbq.FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
                }}
            />
        </>
    );
}