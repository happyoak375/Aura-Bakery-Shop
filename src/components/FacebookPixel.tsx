'use client';

/**
 * @fileoverview Componente Inyector y Rastreador de Meta Pixel (FacebookPixel) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Carga Dinámica del SDK de Meta:
 *    - Descarga el script oficial (`https://connect.facebook.net/en_US/fbevents.js`) usando 
 *      la estrategia 'afterInteractive' de Next.js para no penalizar el rendimiento inicial de carga[cite: 1].
 * 2. Rastreo Reactivo de Navegación (SPA Route Tracking):
 *    - En Next.js App Router las transiciones no recargan el documento HTML completo[cite: 3].
 *    - Este componente escucha mutaciones en `pathname` y `searchParams` y detona automáticamente 
 *      `fbq.pageview()` en cada cambio de vista una vez montado el script[cite: 1, 3].
 * 3. Prevención de Ejecución Prematura:
 *    - Utiliza el callback `onLoad` para activar la bandera `loaded`, garantizando que la función 
 *      global `window.fbq` esté disponible antes de emitir cualquier evento[cite: 1].
 */

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import * as fbq from '@/lib/fpixel';

export default function FacebookPixel() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loaded, setLoaded] = useState<boolean>(false);

    /**
     * ESCUCHA DE TRANSICIONES DE RUTA:
     * Dispara el evento 'PageView' cada vez que el usuario navega a una nueva URL[cite: 1, 3].
     */
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