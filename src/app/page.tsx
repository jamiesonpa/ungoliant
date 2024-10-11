// // src/app/page.tsx

// import ScrollableStoryLandingPageComponent from '../components/MyWebsite'; // Importing the default export


// export default function Home() {
//   return (
//     <div>
//       <ScrollableStoryLandingPageComponent />
//     </div>
//   );
// }



// src/app/page.tsx

import ScrollableStoryLandingPageComponent from '../pages/mywebsite'; // Importing the default export
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        {/* Basic favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* Multiple sizes for different devices */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Apple Touch Icon for iOS */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Manifest for PWA support */}
        <link rel="manifest" href="/site.webmanifest" />

        {/* Optional: Customize theme color for mobile browsers */}
        <meta name="theme-color" content="#ffffff" />
      </Head>

      <div>
        <ScrollableStoryLandingPageComponent />
      </div>
    </>
  );
}