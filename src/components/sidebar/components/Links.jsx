import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import DashIcon from "components/icons/DashIcon";
import { setMicroPage } from "store/slices/authSlice";
import { useDispatch } from "react-redux";

export function SidebarLinks(props) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { routes } = props;

  // Fungsi untuk memeriksa apakah rute aktif berdasarkan path
  const activeRoute = (routeName) => {
    const currentPath = location.pathname.split("?")[0];
    if (routeName.includes(":")) {
      const routeBase = routeName.split("/:")[0];
      return currentPath.startsWith(routeBase);
    }
    return currentPath === routeName || currentPath.startsWith(routeName + "/");
  };

  // Menangani rute dengan makro = true
  useEffect(() => {
    const activeMacroRoute = routes.find(
      (route) => route.makro && activeRoute(`${route.layout}/${route.path}`)
    );

    if (activeMacroRoute) {
      dispatch(setMicroPage(activeMacroRoute.name)); // Set makro page jika rute makro aktif
    } else {
      dispatch(setMicroPage("unset")); // Set unset jika tidak ada rute makro yang aktif
    }
  }, [routes, location.pathname, dispatch]);

  const createLinks = (routes) => {
    return routes
      .filter((route) => {
        if (route.layout === "auth") {
          return false; // Sembunyikan route dengan layout auth
        }

        if (route.makro) {
          const parentRoute = routes.find((r) => r.path === route.parentPath);
          const parentFullPath = `${parentRoute?.layout}/${parentRoute?.path}`;
          return !activeRoute(parentFullPath); // Sembunyikan rute makro jika parentPath aktif
        }

        return true; // Tampilkan semua route lain
      })
      .map((route, index) => {
        if (route.layout === "/admin" || route.layout === "shared") {
          const fullPath = `${route.layout}/${route.path}`;

          if (!route.parentPath) {
            return (
              <Link key={index} to={fullPath}>
                <div className="relative mb-3 flex hover:cursor-pointer">
                  <li className="my-[3px] flex cursor-pointer items-center px-8">
                    <span
                      className={`${activeRoute(fullPath)
                        ? "font-bold text-brand-500 dark:text-white"
                        : "font-medium text-gray-600"
                        }`}
                    >
                      {route.icon ? route.icon : <DashIcon />}
                    </span>
                    <p
                      className={`leading-1 ml-4 flex ${activeRoute(fullPath)
                        ? "font-bold text-navy-700 dark:text-white"
                        : "font-medium text-gray-600"
                        }`}
                    >
                      {route.name}
                    </p>
                  </li>
                  {activeRoute(fullPath) ? (
                    <div className="absolute right-0 top-px h-9 w-1 rounded-lg bg-brand-500 dark:bg-brand-400" />
                  ) : null}
                </div>
              </Link>
            );
          }

          if (route.parentPath) {
            const parentRoute = routes.find((r) => r.path === route.parentPath);
            const parentFullPath = `${parentRoute?.layout}/${parentRoute?.path}`;
            const isParentActive = parentRoute && activeRoute(parentFullPath);
            const isSubPageActive = activeRoute(fullPath);

            if (isParentActive || isSubPageActive) {
              return (
                <div key={index}>
                  <Link to={fullPath}>
                    <div className="relative mb-3 flex hover:cursor-pointer">
                      <li className="my-[3px] flex cursor-pointer items-center px-8">
                        <span
                          className={`${isSubPageActive
                            ? "font-bold text-brand-500 dark:text-white"
                            : "font-medium text-gray-600"
                            }`}
                        >
                          {route.icon ? route.icon : <DashIcon />}
                        </span>
                        <p
                          className={`leading-1 ml-4 flex ${isSubPageActive
                            ? "font-bold text-navy-700 dark:text-white"
                            : "font-medium text-gray-600 text-sm"
                            }`}
                        >
                          {route.name}
                        </p>
                      </li>
                      {isSubPageActive ? (
                        <div className="absolute right-0 top-px h-9 w-1 rounded-lg bg-brand-500 dark:bg-brand-400" />
                      ) : null}
                    </div>
                  </Link>
                </div>
              );
            }
          }
        }
        return null;
      });
  };

  return <>{createLinks(routes)}</>;
}

export default SidebarLinks;
