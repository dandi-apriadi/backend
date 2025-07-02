import authImg from "assets/img/auth/auth.jpg";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import routes from "routes.js";
import Navbar from "components/navbarhome";
import { useEffect, useState } from "react";

const FULL_WIDTH_PAGES = ['Homepage', 'Travel', 'About', 'Destinations', 'Destination Detail'];

export default function Auth() {
  const [page, setPage] = useState("");
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname.split("/").pop();
    const currentRoute = routes.find(
      (route) => route.layout === "/auth" && route.path === currentPath
    );

    if (currentRoute) {
      setPage(currentRoute.name);
      console.log(page)
    }
  }, [location.pathname]);

  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/auth") {
        return (
          <Route path={`/${prop.path}`} element={prop.component} key={key} />
        );
      } else {
        return null;
      }
    });
  };

  document.documentElement.dir = "ltr";
  return (
    <div>
      <div className={`relative float-right h-full min-h-screen w-full 
        ${page === "Sign In"
          ? "bg-slate-50 dark:bg-slate-900"
          : "!bg-white dark:!bg-navy-900"
        }`}
      >
        {/* Add decorative elements for Sign In page */}
        {page === "Sign In" && (
          <>
            <div className="absolute inset-0 overflow-hidden">
              {/* Subtle gradient background */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800 dark:to-slate-950" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#f8fafc_0%,transparent_100%)] dark:bg-[radial-gradient(circle_800px_at_100%_200px,#1e293b_0%,transparent_100%)] opacity-70" />
              </div>

              {/* Subtle pattern overlay */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjUgMEwwIDI1TDI1IDUwTDUwIDI1TDI1IDBaIiBmaWxsPSJibGFjayIgZmlsbC1vcGFjaXR5PSIwLjAyIi8+PC9zdmc+')] bg-[length:50px_50px] opacity-20" />
              </div>

              {/* Floating elements with neutral colors */}
              <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-100/30 to-transparent dark:from-indigo-900/10 rounded-[40%_60%_70%_30%] blur-2xl animate-morph" />
                <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-gradient-to-bl from-blue-100/20 to-transparent dark:from-blue-900/10 rounded-[60%_40%_30%_70%] blur-2xl animate-morph-slow" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-slate-200/10 to-transparent dark:from-slate-700/10 rounded-full blur-3xl animate-pulse-slow" />
              </div>

              {/* Subtle glass effect */}
              <div className="absolute inset-0 backdrop-blur-[80px]">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')] opacity-30" />
              </div>
            </div>
          </>
        )}

        <main className={`mx-auto min-h-screen relative z-10`}>
          <Navbar />
          <div className={`relative flex ${FULL_WIDTH_PAGES.includes(page) ? "w-full h-screen" : ""}`}>
            <div className={`
              ${FULL_WIDTH_PAGES.includes(page)
                ? "w-full h-full p-0 m-0 max-w-none"
                : "mx-auto flex min-h-full w-full flex-col justify-start pt-12 md:max-w-[75%] lg:max-w-[1013px] lg:px-8 lg:pt-0 xl:min-h-[100vh] xl:max-w-[1383px] xl:px-0 xl:pl-[70px]"
              }
            `}>
              <div className="mb-auto flex flex-col pl-5 pr-5 md:pr-0 md:pl-12 lg:max-w-[48%] lg:pl-0 xl:max-w-full">
                <Routes>
                  {getRoutes(routes)}
                  <Route
                    path="/"
                    element={<Navigate to="/auth/homepage" replace />}
                  />
                </Routes>
              </div>
              {/* <Footer /> */}
            </div>
            {page === "Sign In" && (
              <div className="absolute right-0 hidden h-full min-h-screen md:block lg:w-[49vw] 2xl:w-[44vw]">
                <div className="absolute inset-0">
                  {/* Modern gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800/50 via-slate-700/50 to-indigo-900/30 lg:rounded-bl-[120px] xl:rounded-bl-[200px]" />

                  {/* Background image with adjusted opacity */}
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay lg:rounded-bl-[120px] xl:rounded-bl-[200px]"
                    style={{ backgroundImage: `url(${authImg})` }}
                  />

                  {/* Additional gradient for better contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent lg:rounded-bl-[120px] xl:rounded-bl-[200px]" />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
