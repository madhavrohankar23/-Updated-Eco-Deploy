# Graph Report - Eco-Move_Nagpur FYP  (2026-10-24)

## Corpus Check
- 137 files · ~4,919,037 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .ico 1)

## Summary
- 1214 nodes · 2596 edges · 62 communities (56 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `050c7e5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SideRouteAiExplainer.tsx
- react
- dependencies
- ticketing.ts
- cn
- sidebar.tsx
- placesSearch.ts
- utils.ts
- MapView.tsx
- app.tsx
- routing.ts
- pagination.tsx
- package.json
- liveBus.ts
- compilerOptions
- PriorityQueue
- server.ts
- command.tsx
- components.json
- class-variance-authority
- devDependencies
- SpatialIndex
- form.tsx
- network.ts
- RouteFlyThroughController.tsx
- fares.ts
- GreenRewardsPanel.tsx
- vite.config.ts
- safeRoutingService.ts
- ors.ts
- chart.tsx
- nearby.ts
- uberApi.ts
- breadcrumb.tsx
- n8nAiService.ts
- drawer.tsx
- menubar.tsx
- WavAudioRecorder
- eslint.config.js
- scripts
- googleMapsStyles.ts
- Eco-Move Nagpur
- SafeCorridorsLayer.tsx
- navigation-menu.tsx
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- DevBusRouteInspector.tsx
- nagpurPlaces.ts
- CommuterOnboardingModal.tsx
- 🌿 Eco-Move Nagpur
- dbTypes.ts
- busTimetableService.ts
- formatLiveEta
- AiTransitChatbot.tsx
- NearbyStopMarker
- select.tsx
- Journey
- GEMINI.md
- sonner
- MaterialTimePicker.tsx
- carousel.tsx
- input-otp.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `react` - 80 edges
3. `Planner()` - 59 edges
4. `lucide-react` - 52 edges
5. `MapView()` - 31 edges
6. `haversine()` - 27 edges
7. `compilerOptions` - 22 edges
8. `useAuth()` - 21 edges
9. `Journey` - 15 edges
10. `SideRouteAiExplainer()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Eco-Move Nagpur` --provides--> `Digital Pass & QR Ticketing`  [INFERRED]
  AGENTS.md → src/lib/ticketing.ts
- `Eco-Move Nagpur` --rewards--> `Green Carbon Rewards`  [INFERRED]
  AGENTS.md → src/components/GreenRewardsPanel.tsx
- `Eco-Move Nagpur` --implements--> `A* Multimodal Journey Planner`  [INFERRED]
  AGENTS.md → src/lib/routing.ts
- `Eco-Move Nagpur` --monitors--> `Live Bus Telemetry & Tracking`  [INFERRED]
  AGENTS.md → src/lib/liveBus.ts
- `Eco-Move Nagpur` --features--> `Concentric Nearby Transit Locator`  [INFERRED]
  AGENTS.md → src/components/MapView.tsx

## Import Cycles
- None detected.

## Communities (62 total, 6 thin omitted)

### Community 0 - "SideRouteAiExplainer.tsx"
Cohesion: 0.21
Nodes (19): AiTypingLoader(), ElderlyFriendlyRouteExplainer(), MultiRouteComparisonTable(), renderFormattedInlineText(), SideRouteAiExplainer(), TextSize, clearCachedRouteComparison(), clearCachedRouteExplanation() (+11 more)

### Community 1 - "react"
Cohesion: 0.05
Nodes (56): lucide-react, @radix-ui/react-checkbox, react, @tanstack/react-query, @tanstack/react-router, Hero(), HowItWorks(), Navbar() (+48 more)

### Community 2 - "dependencies"
Cohesion: 0.03
Nodes (64): dependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, gmaps-apistyle-encoder, @hookform/resolvers (+56 more)

### Community 3 - "ticketing.ts"
Cohesion: 0.08
Nodes (50): html-to-image, jspdf, qrcode, DigitalTicketPass(), DigitalTicketPassProps, DummyPaymentModal(), DummyPaymentModalProps, SearchableBusPicker() (+42 more)

### Community 4 - "cn"
Cohesion: 0.07
Nodes (47): @radix-ui/react-accordion, @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-dropdown-menu, @radix-ui/react-tabs, AccordionContent, AccordionItem, AccordionTrigger (+39 more)

### Community 5 - "sidebar.tsx"
Cohesion: 0.06
Nodes (41): @radix-ui/react-dialog, Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader() (+33 more)

### Community 6 - "placesSearch.ts"
Cohesion: 0.21
Nodes (18): GoogleMapsSearchBar(), GoogleMapsSearchBarProps, PlaceIcon(), speakWithBrowserVoice(), PlaceIcon(), PlaceSearch(), PoiCategory, fetchGooglePlaces() (+10 more)

### Community 7 - "utils.ts"
Cohesion: 0.07
Nodes (20): @radix-ui/react-hover-card, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-slider, @radix-ui/react-switch, react-resizable-panels (+12 more)

### Community 8 - "MapView.tsx"
Cohesion: 0.09
Nodes (34): AnimatedNearbyCircle(), ClickHandler(), createDestinationMarkerIcon(), createHospitalMarkerIcon(), createLiveBusIcon(), createOriginMarkerIcon(), createPoliceMarkerIcon(), createRestaurantMarkerIcon() (+26 more)

### Community 9 - "app.tsx"
Cohesion: 0.09
Nodes (29): CommuterSurveyLoadingOverlay(), CommuterSurveyLoadingOverlayProps, PROCESSING_PHASES, ProcessingPhaseItem, GoogleMapsLayersFAB(), GoogleMapsLayersFABProps, MapStyleType, ThemeToggle() (+21 more)

### Community 10 - "routing.ts"
Cohesion: 0.08
Nodes (34): computePolylineDistanceM(), cost(), dominates(), Edge, filterParetoFrontier(), getLineFullGeometry(), graph, heuristic() (+26 more)

### Community 11 - "pagination.tsx"
Cohesion: 0.12
Nodes (22): @radix-ui/react-alert-dialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay (+14 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (29): name, private, sideEffects, type, clsx, date-fns, eslint, eslint-config-prettier (+21 more)

### Community 13 - "liveBus.ts"
Cohesion: 0.14
Nodes (22): LiveBusTracker(), LiveBusTrackerProps, POPULAR_BUSES, BusTimetableInfo, calcDistanceMetres(), CompactChaloRouteItem, compileCompactRoutes(), decodeGooglePolyline() (+14 more)

### Community 14 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, exactOptionalPropertyTypes, jsx, lib, module, moduleResolution, noEmit (+15 more)

### Community 15 - "PriorityQueue"
Cohesion: 0.20
Nodes (3): addEdge(), PriorityQueue, validateJourneyMetrics()

### Community 16 - "server.ts"
Cohesion: 0.16
Nodes (14): @tanstack/react-start, consumeLastCapturedError(), describeError(), describeStatus(), originalConsoleError, safeStringify(), renderErrorPage(), fetch() (+6 more)

### Community 17 - "command.tsx"
Cohesion: 0.13
Nodes (16): cmdk, Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+8 more)

### Community 18 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 19 - "class-variance-authority"
Cohesion: 0.14
Nodes (15): class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group, Alert, AlertDescription, AlertTitle, alertVariants, Badge() (+7 more)

### Community 20 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+10 more)

### Community 22 - "form.tsx"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label, react-hook-form, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 23 - "network.ts"
Cohesion: 0.12
Nodes (15): getFrequencyMin(), ROUTE_FREQUENCY_MIN, buildNetwork(), getPlace(), busSchedules, EARTH_R, Mode, norm() (+7 more)

### Community 24 - "RouteFlyThroughController.tsx"
Cohesion: 0.09
Nodes (33): beaconIconCache, calculateBearing(), createFlyThroughBeaconIcon(), DynamicLegLayer, formatLegModeLabel(), haversineDistM(), LegPathVertex, MODE_SPEED_MULTIPLIERS (+25 more)

### Community 25 - "fares.ts"
Cohesion: 0.13
Nodes (20): BusFareLookupResult, busFares, canonicalMetroStations, checkMetroStationNameMatches(), cleanMetroStationName(), findCanonicalMetroStation(), getBusFare(), getLegFare() (+12 more)

### Community 26 - "GreenRewardsPanel.tsx"
Cohesion: 0.26
Nodes (12): GreenRewardsProps, GreenRewardsSection(), REWARD_MILESTONES, RewardMilestone, ScratchCardModal(), ScratchCardModalProps, triggerConfettiPopper(), claimUserRewardMilestone() (+4 more)

### Community 27 - "vite.config.ts"
Cohesion: 0.15
Nodes (6): nitro, @tailwindcss/vite, vite, @vitejs/plugin-react, __dirname, __filename

### Community 28 - "safeRoutingService.ts"
Cohesion: 0.10
Nodes (31): haversine(), findNearestPolylineIndex(), LatLng, sliceRouteGeometry(), BBoxCorridor, bucketMap, CORRIDORS_WITH_BBOX, distToSegmentM() (+23 more)

### Community 29 - "ors.ts"
Cohesion: 0.13
Nodes (20): formatTime(), cacheKey(), driveMemoryCache, driveRoute(), DriveRouteResult, fetchOsmFootRoute(), getPersistentCache(), haversineDistM() (+12 more)

### Community 30 - "chart.tsx"
Cohesion: 0.24
Nodes (11): recharts, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent (+3 more)

### Community 31 - "nearby.ts"
Cohesion: 0.22
Nodes (8): findNearby(), fmtNearbyDist(), getMetroStationLine(), NearbyResult, NearbyStop, allLines, busStops, metroStations

### Community 32 - "uberApi.ts"
Cohesion: 0.23
Nodes (17): CabOptions(), CabOptionsProps, calculateHaversineKm(), decodeGooglePolyline(), fetchUberNavigationRoute(), fetchUberNearbyVehicles(), fetchUberProductPricing(), findUberCabOptions() (+9 more)

### Community 33 - "breadcrumb.tsx"
Cohesion: 0.22
Nodes (8): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 34 - "n8nAiService.ts"
Cohesion: 0.11
Nodes (20): AiIntentType, AiLanguage, AiSearchIntentResult, DEV_ENABLE_N8N, executeAiSearchQuery(), isValidRouteComparisonText(), N8N_CHATBOT_PRODUCTION_WEBHOOK_URL, N8N_CHATBOT_TEST_WEBHOOK_URL (+12 more)

### Community 35 - "drawer.tsx"
Cohesion: 0.25
Nodes (7): vaul, DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 36 - "menubar.tsx"
Cohesion: 0.11
Nodes (12): @radix-ui/react-menubar, Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator (+4 more)

### Community 38 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 39 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 40 - "googleMapsStyles.ts"
Cohesion: 0.25
Nodes (6): GOOGLE_MAPS_NIGHT_MODE_APISTYLE, GOOGLE_MAPS_NIGHT_MODE_STYLES, GoogleMapStyleRule, STYLEPARSE_ELEMENTS, STYLEPARSE_STYLERS, STYLEPARSE_TYPES

### Community 41 - "Eco-Move Nagpur"
Cohesion: 0.33
Nodes (6): A* Multimodal Journey Planner, Digital Pass & QR Ticketing, Eco-Move Nagpur, Green Carbon Rewards, Live Bus Telemetry & Tracking, Concentric Nearby Transit Locator

### Community 42 - "SafeCorridorsLayer.tsx"
Cohesion: 0.16
Nodes (14): leaflet, anchorIconCache, formatAnchorTypeLabel(), getAnchorColor(), getAnchorIcon(), GUARDIAN_ANCHORS, GuardianAnchor, LIT_CORRIDORS (+6 more)

### Community 43 - "navigation-menu.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-navigation-menu, NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 46 - "DevBusRouteInspector.tsx"
Cohesion: 0.40
Nodes (5): react-leaflet, DevBusRouteInspector(), DevRoute, DevStop, FitRoute()

### Community 47 - "nagpurPlaces.ts"
Cohesion: 0.31
Nodes (7): calcDistanceM(), fetchLiveNearbyPOIs(), fetchNagpurWidePOIs(), findNearestPOIs(), NAGPUR_POIS, NagpurPOI, NearbyPoiResult

### Community 48 - "CommuterOnboardingModal.tsx"
Cohesion: 0.36
Nodes (10): CommuterOnboardingModal(), CommuterOnboardingModalProps, CommuterUserProfileInfo, NAGPUR_COMMUTE_HUBS, CommuterProfileData, fetchCommuterProfile(), getCommuterProfile(), hasCompletedCommuterOnboarding() (+2 more)

### Community 49 - "🌿 Eco-Move Nagpur"
Cohesion: 0.06
Nodes (30): 1. Clone the Repository, 1. 🧠 State-Aware A* Multimodal Pathfinding & 4D Pareto Engine, 1. State-Aware Graph Key, 2. A* Evaluation Formula ($f(n) = g(n) + h(n)$), 2. Install Dependencies, 3. Configure Environment Variables, 3. 📅 "Know Your Bus" Timetable & Schedule Explorer, 3. Model Constants & Speeds (+22 more)

### Community 50 - "dbTypes.ts"
Cohesion: 0.17
Nodes (17): @supabase/supabase-js, Point, DbRecentJourney, DbSavedJourney, DbTicket, UserEcoStats, clearUserRecentJourneys(), fetchUserRecentJourneys() (+9 more)

### Community 51 - "busTimetableService.ts"
Cohesion: 0.33
Nodes (10): BusTimetablePanel(), BusTimetablePanelProps, BusTimetableResult, BusTimetableRoute, findBestStopIndex(), formatMinutesToTime(), FormattedDeparture, getBusTimetable() (+2 more)

### Community 52 - "formatLiveEta"
Cohesion: 0.33
Nodes (6): 2. 🚌 Real-Time Live Bus Fleet Telemetry & Tracking, createNearbyLiveBusMarkerIcon(), FitLiveRoute(), FlyToLiveStop(), NearbyLiveBusMarker, formatLiveEta()

### Community 53 - "AiTransitChatbot.tsx"
Cohesion: 0.31
Nodes (9): react-markdown, AiTransitChatbot(), AiTransitChatbotProps, ChatMessage, QUICK_PROMPT_CHIPS, SafarBotIcon(), askAiTransitChatbot(), extractCleanAiText() (+1 more)

### Community 54 - "NearbyStopMarker"
Cohesion: 0.40
Nodes (5): cleanStationTitle(), createTransitMilestoneIcon(), getNearbyStopPointIcon(), NearbyStopMarker, ProgressiveNearbyStopsLayer()

### Community 55 - "select.tsx"
Cohesion: 0.28
Nodes (8): @radix-ui/react-select, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 57 - "Journey"
Cohesion: 0.33
Nodes (6): AiRouteExplainer(), AiRouteExplainerProps, SideRouteAiExplainerProps, N8N_WEBHOOK_URL, Journey, SafeJourney

### Community 61 - "MaterialTimePicker.tsx"
Cohesion: 0.60
Nodes (4): formatTime12h(), MaterialTimePicker(), MaterialTimePickerProps, parseInitialTime()

### Community 62 - "carousel.tsx"
Cohesion: 0.17
Nodes (14): embla-carousel-react, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 64 - "input-otp.tsx"
Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

## Knowledge Gaps
- **24 isolated node(s):** `@hookform/resolvers`, `@tanstack/router-plugin`, `@types/leaflet`, `@types/qrcode`, `date-fns` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 420 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `SideRouteAiExplainer.tsx`, `ticketing.ts`, `cn`, `sidebar.tsx`, `placesSearch.ts`, `utils.ts`, `MapView.tsx`, `app.tsx`, `pagination.tsx`, `package.json`, `liveBus.ts`, `command.tsx`, `class-variance-authority`, `form.tsx`, `RouteFlyThroughController.tsx`, `GreenRewardsPanel.tsx`, `chart.tsx`, `uberApi.ts`, `breadcrumb.tsx`, `drawer.tsx`, `menubar.tsx`, `SafeCorridorsLayer.tsx`, `navigation-menu.tsx`, `DevBusRouteInspector.tsx`, `CommuterOnboardingModal.tsx`, `busTimetableService.ts`, `AiTransitChatbot.tsx`, `select.tsx`, `Journey`, `MaterialTimePicker.tsx`, `carousel.tsx`, `input-otp.tsx`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tanstack/router-plugin`, `@types/leaflet` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.054340396445659606 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `SideRouteAiExplainer.tsx`, `ticketing.ts`, `cn`, `sidebar.tsx`, `placesSearch.ts`, `utils.ts`, `MapView.tsx`, `app.tsx`, `pagination.tsx`, `package.json`, `liveBus.ts`, `command.tsx`, `RouteFlyThroughController.tsx`, `GreenRewardsPanel.tsx`, `uberApi.ts`, `breadcrumb.tsx`, `menubar.tsx`, `SafeCorridorsLayer.tsx`, `navigation-menu.tsx`, `DevBusRouteInspector.tsx`, `CommuterOnboardingModal.tsx`, `busTimetableService.ts`, `AiTransitChatbot.tsx`, `select.tsx`, `Journey`, `MaterialTimePicker.tsx`, `carousel.tsx`, `input-otp.tsx`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `ticketing.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0847457627118644 - nodes in this community are weakly interconnected._