import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/ui/bottom-navigation.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/C:/GymSyncPro-NEW/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=825f384c"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import { Home, Calendar, Bell, User } from "/@fs/C:/GymSyncPro-NEW/node_modules/.vite/deps/lucide-react.js?v=825f384c";
import { Link, useLocation } from "/@fs/C:/GymSyncPro-NEW/node_modules/.vite/deps/wouter.js?v=825f384c";
import ProfileSheet from "/src/components/ui/profile-sheet.tsx";
import NotificationsSheet from "/src/components/ui/notifications-sheet.tsx";
import __vite__cjsImport7_react from "/@fs/C:/GymSyncPro-NEW/node_modules/.vite/deps/react.js?v=825f384c"; const useState = __vite__cjsImport7_react["useState"];
import { cn } from "/src/lib/utils.ts";
export default function BottomNavigation({ notificationCount = 0 }) {
  _s();
  const [location] = useLocation();
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      active: location === "/",
      testId: "bottom-nav-home",
      type: "link"
    },
    {
      icon: Calendar,
      label: "Bookings",
      href: "/my-bookings",
      active: location === "/my-bookings",
      testId: "bottom-nav-bookings",
      type: "link"
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "#",
      active: false,
      testId: "bottom-nav-notifications",
      type: "button",
      badge: notificationCount
    },
    {
      icon: User,
      label: "Profile",
      href: "#",
      active: showProfileSheet,
      testId: "bottom-nav-profile",
      type: "profile"
    }
  ];
  const activeIndex = navItems.findIndex((i) => i.active === true);
  return /* @__PURE__ */ jsxDEV("nav", { className: "md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/60 shadow-xl z-50 rounded-t-xl pb-safe", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "relative", children: activeIndex >= 0 && /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "absolute -top-2 w-16 h-1 rounded-full bg-gradient-to-r from-neon-green to-green-600 shadow-sm transition-left duration-300",
        style: { left: `calc(${(activeIndex + 0.5) * 25}% )`, transform: "translateX(-50%)" }
      },
      void 0,
      false,
      {
        fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
        lineNumber: 79,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
      lineNumber: 76,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-4 h-20 px-3 gap-2 py-3 items-end", children: navItems.map((item) => {
      const Icon = item.icon;
      const isActive = item.active;
      if (item.type === "profile") {
        return /* @__PURE__ */ jsxDEV(
          ProfileSheet,
          {
            open: showProfileSheet,
            onOpenChange: setShowProfileSheet,
            children: /* @__PURE__ */ jsxDEV(
              "button",
              {
                className: cn(
                  "flex flex-col items-center justify-center gap-1.5 relative transition-all duration-300 h-full",
                  "active:scale-95",
                  isActive ? "-translate-y-2" : ""
                ),
                "data-testid": item.testId,
                children: [
                  /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      className: cn(
                        "flex items-center justify-center rounded-full transition-all",
                        isActive ? "w-14 h-14 bg-gradient-to-br from-neon-green to-green-600 shadow-lg" : "w-10 h-10 bg-muted/50"
                      ),
                      children: /* @__PURE__ */ jsxDEV(Icon, { className: cn("transition-colors duration-300", isActive ? "text-white h-6 w-6" : "text-muted-foreground h-5 w-5") }, void 0, false, {
                        fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                        lineNumber: 113,
                        columnNumber: 21
                      }, this)
                    },
                    void 0,
                    false,
                    {
                      fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                      lineNumber: 107,
                      columnNumber: 19
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV("span", { className: cn("text-[11px] font-semibold mt-1", isActive ? "text-neon-green" : "text-muted-foreground"), children: item.label }, void 0, false, {
                    fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                    lineNumber: 115,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                lineNumber: 99,
                columnNumber: 17
              },
              this
            )
          },
          item.testId,
          false,
          {
            fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
            lineNumber: 94,
            columnNumber: 15
          },
          this
        );
      }
      if (item.type === "button") {
        return /* @__PURE__ */ jsxDEV(
          NotificationsSheet,
          {
            open: showNotificationsSheet,
            onOpenChange: setShowNotificationsSheet,
            children: /* @__PURE__ */ jsxDEV(
              "button",
              {
                className: cn(
                  "flex flex-col items-center justify-center gap-1.5 relative transition-all duration-300 h-full",
                  "active:scale-95",
                  showNotificationsSheet ? "-translate-y-2" : ""
                ),
                "data-testid": item.testId,
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: cn("flex items-center justify-center rounded-full transition-all", showNotificationsSheet ? "w-14 h-14 bg-gradient-to-br from-neon-green to-green-600 shadow-lg" : "w-10 h-10 bg-muted/50"), children: [
                    /* @__PURE__ */ jsxDEV(Icon, { className: cn("transition-colors duration-300", showNotificationsSheet ? "text-white h-6 w-6" : "text-muted-foreground h-5 w-5") }, void 0, false, {
                      fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                      lineNumber: 140,
                      columnNumber: 21
                    }, this),
                    item.badge && item.badge > 0 && /* @__PURE__ */ jsxDEV("div", { className: "absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-gradient-to-br from-neon-green to-green-600 rounded-full flex items-center justify-center animate-scale-in shadow-lg border-2 border-background", children: /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-bold text-white px-1", children: item.badge > 9 ? "9+" : item.badge }, void 0, false, {
                      fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                      lineNumber: 143,
                      columnNumber: 25
                    }, this) }, void 0, false, {
                      fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                      lineNumber: 142,
                      columnNumber: 21
                    }, this)
                  ] }, void 0, true, {
                    fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                    lineNumber: 139,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: cn("text-[11px] font-semibold mt-1", showNotificationsSheet ? "text-neon-green" : "text-muted-foreground"), children: item.label }, void 0, false, {
                    fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                    lineNumber: 147,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
                lineNumber: 131,
                columnNumber: 17
              },
              this
            )
          },
          item.testId,
          false,
          {
            fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
            lineNumber: 126,
            columnNumber: 15
          },
          this
        );
      }
      return /* @__PURE__ */ jsxDEV(Link, { href: item.href, className: "relative flex flex-col items-center justify-center h-full", "data-testid": item.testId, children: [
        /* @__PURE__ */ jsxDEV("div", { className: cn("flex items-center justify-center rounded-full transition-all", isActive ? "w-14 h-14 bg-gradient-to-br from-neon-green to-green-600 shadow-lg -translate-y-2" : "w-10 h-10 bg-muted/50"), children: /* @__PURE__ */ jsxDEV(Icon, { className: cn("transition-colors duration-300", isActive ? "text-white h-6 w-6" : "text-muted-foreground h-5 w-5") }, void 0, false, {
          fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
          lineNumber: 159,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
          lineNumber: 158,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: cn("text-[11px] font-semibold mt-1", isActive ? "text-neon-green" : "text-muted-foreground"), children: item.label }, void 0, false, {
          fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
          lineNumber: 161,
          columnNumber: 15
        }, this)
      ] }, item.testId, true, {
        fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
        lineNumber: 157,
        columnNumber: 13
      }, this);
    }) }, void 0, false, {
      fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
      lineNumber: 86,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx",
    lineNumber: 75,
    columnNumber: 5
  }, this);
}
_s(BottomNavigation, "18YHSNEkMUdx6Fs/gVo01hZPlrw=", false, function() {
  return [useLocation];
});
_c = BottomNavigation;
var _c;
$RefreshReg$(_c, "BottomNavigation");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/GymSyncPro-NEW/client/src/components/ui/bottom-navigation.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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LG9CQUFvQix1QkFBdUIsR0FDdkhnQixlQUFLWixTQURSO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBRUE7QUFBQTtBQUFBO0FBQUEsY0FsQkY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBbUJBO0FBQUE7QUFBQSxVQXZCS1ksS0FBS1Q7QUFBQUEsVUFEWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBeUJBO0FBQUEsTUFFSjtBQUdBLGFBQ0UsdUJBQUMsUUFBdUIsTUFBTVMsS0FBS1gsTUFBTSxXQUFVLDZEQUE0RCxlQUFhVyxLQUFLVCxRQUMvSDtBQUFBLCtCQUFDLFNBQUksV0FBV2QsR0FBRyxnRUFBZ0V5QixXQUFXLHNGQUFzRix1QkFBdUIsR0FDek0saUNBQUMsUUFBSyxXQUFXekIsR0FBRyxrQ0FBa0N5QixXQUFXLHVCQUF1QiwrQkFBK0IsS0FBdkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUF5SCxLQUQzSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxRQUNBLHVCQUFDLFVBQUssV0FBV3pCLEdBQUcsa0NBQWtDeUIsV0FBVyxvQkFBb0IsdUJBQXVCLEdBQ3pHRixlQUFLWixTQURSO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFdBTlNZLEtBQUtULFFBQWhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFPQTtBQUFBLElBRUosQ0FBQyxLQWhGSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBaUZBO0FBQUEsT0E1RkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTZGQTtBQUVKO0FBQUNYLEdBM0l1QkYsa0JBQWdCO0FBQUEsVUFDbkJMLFdBQVc7QUFBQTtBQUFBOEIsS0FEUnpCO0FBQWdCLElBQUF5QjtBQUFBQyxhQUFBRCxJQUFBIiwibmFtZXMiOlsiSG9tZSIsIkNhbGVuZGFyIiwiQmVsbCIsIlVzZXIiLCJMaW5rIiwidXNlTG9jYXRpb24iLCJQcm9maWxlU2hlZXQiLCJOb3RpZmljYXRpb25zU2hlZXQiLCJ1c2VTdGF0ZSIsImNuIiwiQm90dG9tTmF2aWdhdGlvbiIsIm5vdGlmaWNhdGlvbkNvdW50IiwiX3MiLCJsb2NhdGlvbiIsInNob3dQcm9maWxlU2hlZXQiLCJzZXRTaG93UHJvZmlsZVNoZWV0Iiwic2hvd05vdGlmaWNhdGlvbnNTaGVldCIsInNldFNob3dOb3RpZmljYXRpb25zU2hlZXQiLCJuYXZJdGVtcyIsImljb24iLCJsYWJlbCIsImhyZWYiLCJhY3RpdmUiLCJ0ZXN0SWQiLCJ0eXBlIiwiYmFkZ2UiLCJhY3RpdmVJbmRleCIsImZpbmRJbmRleCIsImkiLCJsZWZ0IiwidHJhbnNmb3JtIiwibWFwIiwiaXRlbSIsIkljb24iLCJpc0FjdGl2ZSIsIl9jIiwiJFJlZnJlc2hSZWckIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImJvdHRvbS1uYXZpZ2F0aW9uLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBIb21lLCBDYWxlbmRhciwgQmVsbCwgVXNlciB9IGZyb20gXCJsdWNpZGUtcmVhY3RcIjtcbmltcG9ydCB7IExpbmssIHVzZUxvY2F0aW9uIH0gZnJvbSBcIndvdXRlclwiO1xuaW1wb3J0IFByb2ZpbGVTaGVldCBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3Byb2ZpbGUtc2hlZXRcIjtcbmltcG9ydCBOb3RpZmljYXRpb25zU2hlZXQgZnJvbSBcIkAvY29tcG9uZW50cy91aS9ub3RpZmljYXRpb25zLXNoZWV0XCI7XG5pbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgY24gfSBmcm9tIFwiQC9saWIvdXRpbHNcIjtcblxuaW50ZXJmYWNlIEJvdHRvbU5hdmlnYXRpb25Qcm9wcyB7XG4gIG5vdGlmaWNhdGlvbkNvdW50PzogbnVtYmVyO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBCb3R0b21OYXZpZ2F0aW9uKHsgbm90aWZpY2F0aW9uQ291bnQgPSAwIH06IEJvdHRvbU5hdmlnYXRpb25Qcm9wcykge1xuICBjb25zdCBbbG9jYXRpb25dID0gdXNlTG9jYXRpb24oKTtcbiAgY29uc3QgW3Nob3dQcm9maWxlU2hlZXQsIHNldFNob3dQcm9maWxlU2hlZXRdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbc2hvd05vdGlmaWNhdGlvbnNTaGVldCwgc2V0U2hvd05vdGlmaWNhdGlvbnNTaGVldF0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgY29uc3QgbmF2SXRlbXMgPSBbXG4gICAge1xuICAgICAgaWNvbjogSG9tZSxcbiAgICAgIGxhYmVsOiBcIkhvbWVcIixcbiAgICAgIGhyZWY6IFwiL1wiLFxuICAgICAgYWN0aXZlOiBsb2NhdGlvbiA9PT0gXCIvXCIsXG4gICAgICB0ZXN0SWQ6IFwiYm90dG9tLW5hdi1ob21lXCIsXG4gICAgICB0eXBlOiBcImxpbmtcIiBhcyBjb25zdCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGljb246IENhbGVuZGFyLFxuICAgICAgbGFiZWw6IFwiQm9va2luZ3NcIixcbiAgICAgIGhyZWY6IFwiL215LWJvb2tpbmdzXCIsXG4gICAgICBhY3RpdmU6IGxvY2F0aW9uID09PSBcIi9teS1ib29raW5nc1wiLFxuICAgICAgdGVzdElkOiBcImJvdHRvbS1uYXYtYm9va2luZ3NcIixcbiAgICAgIHR5cGU6IFwibGlua1wiIGFzIGNvbnN0LFxuICAgIH0sXG4gICAge1xuICAgICAgaWNvbjogQmVsbCxcbiAgICAgIGxhYmVsOiBcIk5vdGlmaWNhdGlvbnNcIixcbiAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgIHRlc3RJZDogXCJib3R0b20tbmF2LW5vdGlmaWNhdGlvbnNcIixcbiAgICAgIHR5cGU6IFwiYnV0dG9uXCIgYXMgY29uc3QsXG4gICAgICBiYWRnZTogbm90aWZpY2F0aW9uQ291bnQsXG4gICAgfSxcbiAgICB7XG4gICAgICBpY29uOiBVc2VyLFxuICAgICAgbGFiZWw6IFwiUHJvZmlsZVwiLFxuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBhY3RpdmU6IHNob3dQcm9maWxlU2hlZXQsXG4gICAgICB0ZXN0SWQ6IFwiYm90dG9tLW5hdi1wcm9maWxlXCIsXG4gICAgICB0eXBlOiBcInByb2ZpbGVcIiBhcyBjb25zdCxcbiAgICB9XG4gIF07XG5cbiAgY29uc3QgYWN0aXZlSW5kZXggPSBuYXZJdGVtcy5maW5kSW5kZXgoKGkpID0+IGkuYWN0aXZlID09PSB0cnVlKTtcblxuICByZXR1cm4gKFxuICAgIDxuYXYgY2xhc3NOYW1lPVwibWQ6aGlkZGVuIGZpeGVkIGJvdHRvbS0wIGxlZnQtMCByaWdodC0wIGJnLWNhcmQvOTUgYmFja2Ryb3AtYmx1ci1tZCBib3JkZXItdCBib3JkZXItYm9yZGVyLzYwIHNoYWRvdy14bCB6LTUwIHJvdW5kZWQtdC14bCBwYi1zYWZlXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlXCI+XG4gICAgICAgIHsvKiBBY3RpdmUgaW5kaWNhdG9yIChtb3ZlcyB0byBhY3RpdmUgaXRlbSkgKi99XG4gICAgICAgIHthY3RpdmVJbmRleCA+PSAwICYmIChcbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTIgdy0xNiBoLTEgcm91bmRlZC1mdWxsIGJnLWdyYWRpZW50LXRvLXIgZnJvbS1uZW9uLWdyZWVuIHRvLWdyZWVuLTYwMCBzaGFkb3ctc20gdHJhbnNpdGlvbi1sZWZ0IGR1cmF0aW9uLTMwMFwiXG4gICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgY2FsYygkeyhhY3RpdmVJbmRleCArIDAuNSkgKiAyNX0lIClgLCB0cmFuc2Zvcm06IFwidHJhbnNsYXRlWCgtNTAlKVwiIH19XG4gICAgICAgICAgLz5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTQgaC0yMCBweC0zIGdhcC0yIHB5LTMgaXRlbXMtZW5kXCI+XG4gICAgICAgIHtuYXZJdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBjb25zdCBJY29uID0gaXRlbS5pY29uO1xuICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaXRlbS5hY3RpdmU7XG5cbiAgICAgICAgICAvLyBQcm9maWxlIHNoZWV0XG4gICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gXCJwcm9maWxlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxQcm9maWxlU2hlZXRcbiAgICAgICAgICAgICAgICBrZXk9e2l0ZW0udGVzdElkfVxuICAgICAgICAgICAgICAgIG9wZW49e3Nob3dQcm9maWxlU2hlZXR9XG4gICAgICAgICAgICAgICAgb25PcGVuQ2hhbmdlPXtzZXRTaG93UHJvZmlsZVNoZWV0fVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgXCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMS41IHJlbGF0aXZlIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTMwMCBoLWZ1bGxcIixcbiAgICAgICAgICAgICAgICAgICAgXCJhY3RpdmU6c2NhbGUtOTVcIixcbiAgICAgICAgICAgICAgICAgICAgaXNBY3RpdmUgPyBcIi10cmFuc2xhdGUteS0yXCIgOiBcIlwiXG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgZGF0YS10ZXN0aWQ9e2l0ZW0udGVzdElkfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjbihcbiAgICAgICAgICAgICAgICAgICAgICBcImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtZnVsbCB0cmFuc2l0aW9uLWFsbFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzQWN0aXZlID8gXCJ3LTE0IGgtMTQgYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1uZW9uLWdyZWVuIHRvLWdyZWVuLTYwMCBzaGFkb3ctbGdcIiA6IFwidy0xMCBoLTEwIGJnLW11dGVkLzUwXCJcbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPEljb24gY2xhc3NOYW1lPXtjbihcInRyYW5zaXRpb24tY29sb3JzIGR1cmF0aW9uLTMwMFwiLCBpc0FjdGl2ZSA/IFwidGV4dC13aGl0ZSBoLTYgdy02XCIgOiBcInRleHQtbXV0ZWQtZm9yZWdyb3VuZCBoLTUgdy01XCIpfSAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2NuKFwidGV4dC1bMTFweF0gZm9udC1zZW1pYm9sZCBtdC0xXCIsIGlzQWN0aXZlID8gXCJ0ZXh0LW5lb24tZ3JlZW5cIiA6IFwidGV4dC1tdXRlZC1mb3JlZ3JvdW5kXCIpfT5cbiAgICAgICAgICAgICAgICAgICAge2l0ZW0ubGFiZWx9XG4gICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvUHJvZmlsZVNoZWV0PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBOb3RpZmljYXRpb25zIHNoZWV0XG4gICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gXCJidXR0b25cIikge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPE5vdGlmaWNhdGlvbnNTaGVldFxuICAgICAgICAgICAgICAgIGtleT17aXRlbS50ZXN0SWR9XG4gICAgICAgICAgICAgICAgb3Blbj17c2hvd05vdGlmaWNhdGlvbnNTaGVldH1cbiAgICAgICAgICAgICAgICBvbk9wZW5DaGFuZ2U9e3NldFNob3dOb3RpZmljYXRpb25zU2hlZXR9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NuKFxuICAgICAgICAgICAgICAgICAgICBcImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xLjUgcmVsYXRpdmUgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMzAwIGgtZnVsbFwiLFxuICAgICAgICAgICAgICAgICAgICBcImFjdGl2ZTpzY2FsZS05NVwiLFxuICAgICAgICAgICAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uc1NoZWV0ID8gXCItdHJhbnNsYXRlLXktMlwiIDogXCJcIlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIGRhdGEtdGVzdGlkPXtpdGVtLnRlc3RJZH1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17Y24oXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1hbGxcIiwgc2hvd05vdGlmaWNhdGlvbnNTaGVldCA/IFwidy0xNCBoLTE0IGJnLWdyYWRpZW50LXRvLWJyIGZyb20tbmVvbi1ncmVlbiB0by1ncmVlbi02MDAgc2hhZG93LWxnXCIgOiBcInctMTAgaC0xMCBiZy1tdXRlZC81MFwiKX0+XG4gICAgICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT17Y24oXCJ0cmFuc2l0aW9uLWNvbG9ycyBkdXJhdGlvbi0zMDBcIiwgc2hvd05vdGlmaWNhdGlvbnNTaGVldCA/IFwidGV4dC13aGl0ZSBoLTYgdy02XCIgOiBcInRleHQtbXV0ZWQtZm9yZWdyb3VuZCBoLTUgdy01XCIpfSAvPlxuICAgICAgICAgICAgICAgICAgICB7aXRlbS5iYWRnZSAmJiBpdGVtLmJhZGdlID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTEuNSAtcmlnaHQtMS41IG1pbi13LVsyMHB4XSBoLVsyMHB4XSBiZy1ncmFkaWVudC10by1iciBmcm9tLW5lb24tZ3JlZW4gdG8tZ3JlZW4tNjAwIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBhbmltYXRlLXNjYWxlLWluIHNoYWRvdy1sZyBib3JkZXItMiBib3JkZXItYmFja2dyb3VuZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1ib2xkIHRleHQtd2hpdGUgcHgtMVwiPntpdGVtLmJhZGdlID4gOSA/IFwiOStcIiA6IGl0ZW0uYmFkZ2V9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2NuKFwidGV4dC1bMTFweF0gZm9udC1zZW1pYm9sZCBtdC0xXCIsIHNob3dOb3RpZmljYXRpb25zU2hlZXQgPyBcInRleHQtbmVvbi1ncmVlblwiIDogXCJ0ZXh0LW11dGVkLWZvcmVncm91bmRcIil9PlxuICAgICAgICAgICAgICAgICAgICB7aXRlbS5sYWJlbH1cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9Ob3RpZmljYXRpb25zU2hlZXQ+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJlZ3VsYXIgbGlua3NcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPExpbmsga2V5PXtpdGVtLnRlc3RJZH0gaHJlZj17aXRlbS5ocmVmfSBjbGFzc05hbWU9XCJyZWxhdGl2ZSBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBoLWZ1bGxcIiBkYXRhLXRlc3RpZD17aXRlbS50ZXN0SWR9PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17Y24oXCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbi1hbGxcIiwgaXNBY3RpdmUgPyBcInctMTQgaC0xNCBiZy1ncmFkaWVudC10by1iciBmcm9tLW5lb24tZ3JlZW4gdG8tZ3JlZW4tNjAwIHNoYWRvdy1sZyAtdHJhbnNsYXRlLXktMlwiIDogXCJ3LTEwIGgtMTAgYmctbXV0ZWQvNTBcIil9PlxuICAgICAgICAgICAgICAgIDxJY29uIGNsYXNzTmFtZT17Y24oXCJ0cmFuc2l0aW9uLWNvbG9ycyBkdXJhdGlvbi0zMDBcIiwgaXNBY3RpdmUgPyBcInRleHQtd2hpdGUgaC02IHctNlwiIDogXCJ0ZXh0LW11dGVkLWZvcmVncm91bmQgaC01IHctNVwiKX0gLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17Y24oXCJ0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIG10LTFcIiwgaXNBY3RpdmUgPyBcInRleHQtbmVvbi1ncmVlblwiIDogXCJ0ZXh0LW11dGVkLWZvcmVncm91bmRcIil9PlxuICAgICAgICAgICAgICAgIHtpdGVtLmxhYmVsfVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L0xpbms+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L2Rpdj5cbiAgICA8L25hdj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiQzovR3ltU3luY1Byby1ORVcvY2xpZW50L3NyYy9jb21wb25lbnRzL3VpL2JvdHRvbS1uYXZpZ2F0aW9uLnRzeCJ9