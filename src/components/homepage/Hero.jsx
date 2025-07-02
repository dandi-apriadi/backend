import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useSelector } from 'react-redux';
import axios from 'axios'; // Import axios directly
import "./style.css";

// Update the preloadImage function
const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error('No image source provided'));
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(src); // Return the src instead of img
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
};

// Add these translations to support multilingual itinerary information
const translations = {
    EN: {
        itinerary: "Itinerary",
        scheduledStops: "Scheduled Stops",
        noItinerary: "No itinerary details available for this tour.",
        close: "Close",
        location: "Location",
        bestTime: "Best Time",
        duration: "Duration"
    },
    ID: {
        itinerary: "Rencana Perjalanan",
        scheduledStops: "Perhentian Terjadwal",
        noItinerary: "Tidak ada detail rencana perjalanan untuk tur ini.",
        close: "Tutup",
        location: "Lokasi",
        bestTime: "Waktu Terbaik",
        duration: "Durasi"
    },
    CN: {
        itinerary: "行程",
        scheduledStops: "预定停留点",
        noItinerary: "此行程没有可用的行程详细信息。",
        close: "关闭",
        location: "位置",
        bestTime: "最佳时间",
        duration: "时长"
    }
};

// Add itinerary props to the function definition
const Hero = ({
    onSlideChange,
    onLearnMore,
    destinations = [],
    itinerary = null, // Accept itinerary data from parent
    isLoadingItinerary = false,
    itineraryError = null,
    onRetryItinerary = null
}) => {
    const [activeSlide, setActiveSlide] = useState(0);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [visibleCards, setVisibleCards] = useState([]);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [preloadedImages, setPreloadedImages] = useState({});
    // Add state for itinerary modal
    const [isItineraryModalOpen, setIsItineraryModalOpen] = useState(false);
    // Get the current language from Redux store
    const { language = 'EN' } = useSelector((state) => state.auth);

    // Use itinerary data from props first, then fallback to local state
    const [localItinerary, setLocalItinerary] = useState(null);
    const [localIsLoadingItinerary, setLocalIsLoadingItinerary] = useState(false);
    const [localItineraryError, setLocalItineraryError] = useState(null);

    // Use either props or local state for itinerary data
    const currentItinerary = itinerary || localItinerary;
    const currentIsLoadingItinerary = isLoadingItinerary || localIsLoadingItinerary;
    const currentItineraryError = itineraryError || localItineraryError;

    // Add translation helper function
    const t = (key) => {
        const currentTranslations = translations[language] || translations.EN;
        return currentTranslations[key] || key;
    };

    // Simplify the background style function
    const getBackgroundImageStyle = (imageUrl) => ({
        backgroundImage: imageUrl ? `url('${imageUrl}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
    });

    // Add useEffect to preload images
    useEffect(() => {
        const loadImages = async () => {
            const imagePromises = destinations.map(async (dest) => {
                if (dest?.destination?.destination_img) {
                    try {
                        await preloadImage(dest.destination.destination_img);
                        return [dest.destination.destination_img, true];
                    } catch (error) {
                        console.error('Failed to load image:', error);
                        return [dest.destination.destination_img, false];
                    }
                }
                return null;
            });

            const loadedImages = await Promise.all(imagePromises);
            const imageMap = Object.fromEntries(loadedImages.filter(Boolean));
            setPreloadedImages(imageMap);
        };

        loadImages();
    }, [destinations]);

    // Update background image loading effect
    useEffect(() => {
        const loadCurrentImage = async () => {
            if (!destinations[activeSlide]?.destination?.destination_img) return;

            try {
                const imageUrl = await preloadImage(destinations[activeSlide].destination.destination_img);
                setPreloadedImages(prev => ({
                    ...prev,
                    [destinations[activeSlide].destination.destination_img]: imageUrl
                }));
            } catch (error) {
                console.error('Failed to load background image:', error);
            }
        };

        loadCurrentImage();
    }, [activeSlide, destinations]);

    // Update updateVisibleCards to use destinations
    const updateVisibleCards = React.useCallback(() => {
        setVisibleCards(destinations.map((dest, index) => ({
            id: dest.id,
            virtualIndex: index,
            bgImage: dest.bgImage,
            thumbnail: dest.thumbnail,
            category: dest.category,
            tourName: dest.tourName,
            description: dest.description,
            visitDuration: dest.visitDuration,
            details: dest.details,
            position: dest.position,
            comments: dest.comments
        })));
    }, [destinations]);

    // Update the handleCardClick function
    const handleCardClick = (index) => {
        if (isTransitioning) return;
        setIsTransitioning(true);

        const cardWidth = 340; // Width of each card
        const containerWidth = 1024; // Approximate container width
        const visibleCardsCount = Math.floor(containerWidth / cardWidth);
        const centerOffset = Math.floor(visibleCardsCount / 2);

        let newPosition;
        // Special handling for last card to center it
        if (index === destinations.length - 1) {
            newPosition = (destinations.length - visibleCardsCount) * cardWidth + (cardWidth / 2);
        } else {
            newPosition = Math.max(0, (index - centerOffset) * cardWidth);
        }

        // Prevent scrolling too far right
        const maxScroll = (destinations.length - visibleCardsCount) * cardWidth;
        newPosition = Math.min(newPosition, maxScroll);

        setScrollPosition(newPosition);
        setActiveSlide(index);

        setTimeout(() => {
            setIsTransitioning(false);
        }, 500);
    };

    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: true,
        });
    }, []);

    useEffect(() => {
        console.log(destinations);
        const img = new Image();
        img.src = destinations[0]?.thumbnail;
    }, [destinations]);

    useEffect(() => {
        // Initialize visible cards
        updateVisibleCards(scrollPosition);
    }, [scrollPosition, updateVisibleCards]);

    // Update handleScroll function
    const handleScroll = (direction) => {
        if (isTransitioning) return;
        setIsTransitioning(true);

        const cardWidth = 340;
        const containerWidth = 1024;
        const visibleCards = Math.floor(containerWidth / cardWidth);

        let newActiveSlide;
        if (direction === 'left') {
            newActiveSlide = Math.max(0, activeSlide - 1);
        } else {
            newActiveSlide = Math.min(destinations.length - 1, activeSlide + 1);
        }

        // Calculate scroll position based on active slide
        const centerOffset = Math.floor(visibleCards / 2);
        let newPosition = Math.max(0, (newActiveSlide - centerOffset) * cardWidth);

        // Prevent scrolling too far right
        const maxScroll = (destinations.length - visibleCards) * cardWidth;
        newPosition = Math.min(newPosition, maxScroll);

        setScrollPosition(newPosition);
        setActiveSlide(newActiveSlide);

        setTimeout(() => {
            setIsTransitioning(false);
        }, 500);
    };

    // Update the cardContent function
    const cardContent = (tour) => (
        <div className="relative h-[400px] w-full overflow-hidden">
            {/* Image Container with Enhanced Quality */}
            <div className="absolute inset-0">
                <img
                    src={tour.bgImage}
                    crossOrigin='anonymous'
                    alt={tour.tourName}
                    className="w-full h-full object-cover card-image transition-transform duration-500 
                        group-hover:scale-105"
                    loading="eager"
                    draggable="false"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'fallback-image-url'; // Add a fallback image URL
                    }}
                />
                {/* Improved Gradient Overlay with Active State */}
                <div className={`absolute inset-0 bg-gradient-to-t 
                    from-black/90 via-black/50 to-transparent 
                    transition-opacity duration-300
                    ${activeSlide === tour.virtualIndex % destinations.length
                        ? 'opacity-0'
                        : 'opacity-10 group-hover:opacity-40'
                    }`}
                />
            </div>

            {/* Enhanced Content Container */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                {/* Enhanced Category Badge with Glossy Effect */}
                <span className="relative w-32 inline-flex items-center gap-2.5 px-5 py-2.5 mb-4
                    before:absolute before:inset-0 before:bg-white/10 
                    before:backdrop-blur-sm before:rounded-full before:-z-10 
                    before:transition-all before:duration-300
                    after:absolute after:inset-0 after:bg-gradient-to-r 
                    after:from-teal-500/50 after:to-teal-600/50 
                    after:rounded-full after:-z-20 
                    after:transition-all after:duration-300
                    group-hover:before:bg-white/20
                    text-sm font-medium text-white
                    transform transition-all duration-300 
                    hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]
                    group-hover:-translate-y-1">
                    <svg
                        className="w-4 h-4 transition-transform duration-300 
                            group-hover:scale-110 group-hover:rotate-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span className="relative">
                        {tour.category}
                    </span>
                </span>

                {/* Enhanced Title with dynamic text sizing */}
                <h3 className={`font-bold text-white mb-3 
                    tracking-tight leading-tight drop-shadow-md
                    transition-all duration-300 group-hover:-translate-y-1
                    ${tour.tourName.length > 25
                        ? 'text-lg'
                        : tour.tourName.length > 20
                            ? 'text-xl'
                            : 'text-2xl'
                    }`}>
                    {tour.tourName}
                </h3>

                {/* Improved Description */}
                <p className="text-base text-gray-100 line-clamp-2 
                    leading-relaxed drop-shadow-md transition-all duration-300
                    group-hover:text-white max-w-[90%]">
                    {tour.description}
                </p>
            </div>
        </div>
    );

    // Improved function to fetch itinerary data for local use only if not provided via props
    const fetchItineraryData = async (packageId) => {
        // Skip fetching if we already have data from props
        if (itinerary !== null || !packageId) {
            return;
        }

        setLocalIsLoadingItinerary(true);
        setLocalItineraryError(null);

        try {
            console.log(`🔍 Hero component fetching itinerary data for ID: ${packageId}`);            // Use a configurable API base URL - NO LOCALHOST FALLBACK
            const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
            const response = await axios.get(`${apiBaseUrl}/api/itinerary/${packageId}`, {
                params: {
                    language: language.toLowerCase()
                },
                timeout: 8000 // Add timeout to prevent indefinite waiting
            });

            // Handle successful response
            if (response.data?.success && response.data?.data) {
                console.log(`✅ Hero successfully received itinerary with ${response.data.data.stops?.length || 0} stops`);
                setLocalItinerary(response.data.data);
            } else {
                // Handle API success but with error in response
                throw new Error(response.data?.message || 'Received invalid data structure from API');
            }
        } catch (error) {
            // Enhanced error handling with specific messages
            console.error(`❌ Hero error fetching itinerary for packageId: ${packageId}`, error);

            if (error.response) {
                // Server responded with error status
                setLocalItineraryError(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                // No response received
                setLocalItineraryError('No response received from server. Please check your connection.');
            } else {
                // Request setup error
                setLocalItineraryError(`Request error: ${error.message}`);
            }
        } finally {
            setLocalIsLoadingItinerary(false);
        }
    };

    // Modified useEffect for itinerary fetching - only runs if itinerary is not provided via props
    useEffect(() => {
        // Skip fetching if itinerary data is passed via props
        if (itinerary !== null) {
            return;
        }

        let isMounted = true;

        const loadItineraryData = async () => {
            if (!destinations.length || activeSlide >= destinations.length) {
                return;
            }

            const currentDestination = destinations[activeSlide];

            // First check for travel_id which is the most reliable ID for itineraries
            let packageId = null;

            if (currentDestination.travel_id) {
                packageId = currentDestination.travel_id;
                console.log(`📋 Using travel_id: ${packageId} for itinerary fetch`);
            } else if (currentDestination.id) {
                packageId = currentDestination.id;
                console.log(`📋 Fallback to id: ${packageId} for itinerary fetch`);
            } else if (currentDestination.packageId) {
                packageId = currentDestination.packageId;
                console.log(`📋 Fallback to packageId: ${packageId} for itinerary fetch`);
            } else if (currentDestination.slug) {
                packageId = currentDestination.slug;
                console.log(`📋 Fallback to slug: ${packageId} for itinerary fetch`);
            } else if (currentDestination.travelSlug) {
                packageId = currentDestination.travelSlug;
                console.log(`📋 Fallback to travelSlug: ${packageId} for itinerary fetch`);
            }

            if (packageId && isMounted) {
                await fetchItineraryData(packageId);
            } else {
                console.error('❌ No valid ID found to fetch itinerary data', currentDestination);
                setLocalItineraryError('Could not identify tour package ID');
            }
        };

        loadItineraryData();

        // Cleanup function to prevent state updates if component unmounts
        return () => {
            isMounted = false;
        };
    }, [activeSlide, destinations, language, itinerary]);

    // Update useEffect to pass data to parent
    useEffect(() => {
        if (onSlideChange && destinations.length > 0) {
            onSlideChange(activeSlide, destinations[activeSlide]);
        }
    }, [activeSlide, destinations, onSlideChange]); // Remove onSlideChange from dependencies

    // Inside the Hero component, add this useEffect
    useEffect(() => {
        const currentImageUrl = destinations[activeSlide]?.destination?.destination_img;
    }, [activeSlide, destinations]);

    // When adding the retry button functionality, use either onRetryItinerary from props or call local fetchItineraryData
    const handleRetryItinerary = () => {
        if (onRetryItinerary) {
            onRetryItinerary();
        } else {
            const currentDestination = destinations[activeSlide];
            let packageId = currentDestination?.travel_id ||
                currentDestination?.id ||
                currentDestination?.packageId ||
                currentDestination?.slug ||
                currentDestination?.travelSlug;

            if (packageId) fetchItineraryData(packageId);
        }
    };

    // Function to sort destinations by position for itinerary display
    const getSortedItineraryStops = () => {
        if (!destinations || !destinations[activeSlide]?.destinationList) {
            return [];
        }

        // Try to get the destination list from the current active slide
        const destinationList = [...(destinations[activeSlide].destinationList || [])];
        return destinationList.sort((a, b) => a.position - b.position);
    };

    return (
        <div className="relative h-screen w-full overflow-hidden">
            {/* Main Background with Image */}
            <div className="absolute inset-0 transition-all duration-700 ease-in-out bg-black">
                <img
                    src={destinations[activeSlide]?.bgImage || ''}
                    alt={destinations[activeSlide]?.tourName || 'Background'}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                    crossOrigin="anonymous"
                    loading="eager"
                />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            {/* Itinerary Button - Top Right Corner */}
            <button
                onClick={() => setIsItineraryModalOpen(true)}
                className="absolute top-24 right-8 z-30 px-5 py-3 rounded-full
                    bg-teal-500/20 backdrop-blur-sm
                    border border-teal-400/30
                    hover:bg-teal-500/30 hover:border-teal-400/50
                    transition-all duration-300 
                    flex items-center gap-2 text-white
                    shadow-lg shadow-teal-900/20"
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                </svg>
                <span className="font-medium">{t('itinerary')}</span>
            </button>

            {/* Bottom Content Section - Adjusted padding */}
            <div className="absolute bottom-24 left-0 right-0"> {/* Changed from bottom-0 and pb-16 */}
                <div className="mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-10 items-end">
                        {/* Left Content - Increased spacing */}
                        <div className="lg:w-1/2" data-aos="fade-right">
                            <div className="text-white space-y-6">
                                <span className="relative inline-flex items-center gap-2.5 px-5 py-2.5
                                    before:absolute before:inset-0 before:bg-white/10 
                                    before:backdrop-blur-sm before:rounded-full before:-z-10 
                                    before:transition-all before:duration-300
                                    after:absolute after:inset-0 after:bg-gradient-to-r 
                                    after:from-teal-500/50 after:to-teal-600/50 
                                    after:rounded-full after:-z-20 
                                    after:transition-all after:duration-300
                                    group-hover:before:bg-white/20
                                    text-sm font-medium text-white
                                    transform transition-all duration-300 
                                    hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]
                                    hover:-translate-y-1">
                                    <svg
                                        className="w-4 h-4 transition-transform duration-300 
                                            group-hover:scale-110 group-hover:rotate-3"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    {destinations[activeSlide]?.category || ''}
                                </span>
                                <h1 className="text-6xl font-bold leading-tight">
                                    {destinations[activeSlide]?.tourName || ''}
                                </h1>
                                <div className="space-y-4">
                                    {/* Visit Duration */}
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 
                                            bg-white/10 backdrop-blur-sm rounded-full
                                            border border-white/20 text-sm font-medium text-white">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {destinations[activeSlide]?.visitDuration || ''}
                                        </span>
                                    </div>

                                    {/* Comments in English */}
                                    <p className="inline-flex items-center gap-2 px-3 py-1.5 
                                            bg-white/10 backdrop-blur-sm rounded-full
                                            border border-white/20 text-md text-justify font-medium text-white">
                                        {destinations[activeSlide]?.comments?.en || ''}
                                    </p>

                                </div>
                                <div className="flex items-center gap-4 pt-6">
                                    {/* Learn More Button */}
                                    <button
                                        onClick={onLearnMore}
                                        className="group relative px-8 py-4 bg-white/10 backdrop-blur-sm text-white 
                                            rounded-full overflow-hidden transition-all duration-300 hover:bg-white/20"
                                    >
                                        <span className="relative z-10 font-medium flex items-center gap-2">
                                            Learn More
                                            <svg
                                                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                                />
                                            </svg>
                                        </span>
                                    </button>

                                    {/* Checkout Button */}
                                    <button
                                        onClick={() => {
                                            // WhatsApp message template
                                            const message = `Hi, I'm interested in booking the ${destinations[activeSlide]?.tourName} tour.`;
                                            const phoneNumber = '6282195818007'; // Replace with your WhatsApp number
                                            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                                            window.open(whatsappUrl, '_blank');
                                        }}
                                        className="group px-6 py-4 bg-white/10 backdrop-blur-sm text-white 
                                            rounded-full overflow-hidden transition-all duration-300 hover:bg-white/20"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            <svg
                                                className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M17 8h2a2 0 012 2v6a2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                            </svg>
                                            <span className="font-medium">Checkout</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Content - Cards */}
                        <div className="lg:w-1/2">
                            <div className="relative">
                                {/* Added dark background wrapper with gradient */}
                                <div className="absolute inset-0 -inset-x-4 -inset-y-4 
                                    backdrop-filter backdrop-blur-xl rounded-[2rem] shadow-2xl" />

                                <div className="relative overflow-hidden">

                                    {/* Fixed width container with proper spacing */}
                                    <div className="relative w-[calc(100%+2rem)] -ml-4">
                                        <div
                                            className={`flex gap-3 transition-all duration-500 ease-out px-8
                                                ${activeSlide === destinations.length - 1 ? 'pr-[calc(100%-320px)]' : ''}`}
                                            style={{
                                                transform: `translateX(-${scrollPosition}px)`,
                                            }}
                                        >
                                            {visibleCards.map((tour) => (
                                                <div
                                                    key={tour.id}
                                                    onClick={() => handleCardClick(tour.virtualIndex)}
                                                    className={`flex-shrink-0 w-[320px] group relative rounded-2xl overflow-hidden 
                                                        cursor-pointer transform transition-all duration-500
                                                        ${activeSlide === tour.virtualIndex
                                                            ? 'scale-100 translate-y-0 opacity-100 z-10 ring-2 ring-teal-500/30'
                                                            : 'scale-95 translate-y-4 hover:translate-y-0 hover:scale-[0.98] opacity-70 hover:opacity-85'
                                                        }`}
                                                >
                                                    {cardContent(tour)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Replace the navigation controls section */}
                                <div className="relative">
                                    <div className="absolute -bottom-20 left-0 right-0">
                                        <div className="flex items-center justify-between">
                                            {/* Left Button - Larger size */}
                                            <button
                                                onClick={() => handleScroll('left')}
                                                disabled={isTransitioning}
                                                className={`group overflow-hidden p-3.5 rounded-full 
                    transition-all duration-300 
                    bg-gradient-to-br from-white/20 to-white/5
                    hover:from-white/30 hover:to-white/10
                    active:scale-95
                    disabled:from-white/5 disabled:to-white/5
                    backdrop-blur-md
                    border border-white/20 hover:border-white/30
                    shadow-lg shadow-black/20
                    ${isTransitioning ? 'opacity-50' : 'hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}
                                            >
                                                <span className="relative z-10 flex items-center justify-center">
                                                    <svg
                                                        className="w-5 h-5 text-white transition-all duration-300 
                            group-hover:text-white group-hover:scale-110"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2.5}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </span>
                                            </button>

                                            {/* Indicators - Larger size */}
                                            <div className="flex items-center gap-3">
                                                {destinations.map((_, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleCardClick(index)}
                                                        className="group relative py-3" // Added padding for larger hit area
                                                    >
                                                        <span className={`block transition-all duration-500 transform rounded-full
                ${activeSlide === index
                                                                ? 'w-12 h-1.5 bg-gradient-to-r from-teal-400 via-teal-300 to-teal-400 scale-100 shadow-[0_0_8px_rgba(45,212,191,0.5)]'
                                                                : 'w-8 h-1 bg-white/30 scale-90 group-hover:scale-95 group-hover:bg-white/50 group-hover:shadow-[0_0_5px_rgba(255,255,255,0.3)]'
                                                            }`}
                                                        />
                                                        {activeSlide === index && (
                                                            <span className="absolute inset-0 flex items-center">
                                                                <span className="w-12 h-1.5 rounded-full bg-teal-400/20 
                        animate-ping duration-700"
                                                                />
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Right side controls group */}
                                            <div className="flex items-center gap-4">
                                                {/* Counter with Progress - Larger size */}
                                                <div className="relative flex items-center">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-400/30 to-teal-500/20 
                        backdrop-blur-md rounded-full border border-white/20 
                        shadow-[0_0_15px_rgba(20,184,166,0.25)]">
                                                    </div>
                                                    <svg className="w-14 h-14 -rotate-90 transform relative z-10">
                                                        <circle
                                                            className="text-white/5"
                                                            strokeWidth="2.5"
                                                            stroke="currentColor"
                                                            fill="transparent"
                                                            r="24"
                                                            cx="28"
                                                            cy="28"
                                                        />
                                                        <circle
                                                            className="text-teal-400 transition-all duration-500"
                                                            strokeWidth="3"
                                                            strokeDasharray={150.72}
                                                            strokeDashoffset={150.72 - (activeSlide + 1) / destinations.length * 150.72}
                                                            strokeLinecap="round"
                                                            stroke="url(#progressGradient)"
                                                            fill="transparent"
                                                            r="24"
                                                            cx="28"
                                                            cy="28"
                                                            style={{
                                                                filter: "drop-shadow(0 0 4px rgba(45,212,191,0.5))"
                                                            }}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="relative z-20 px-4 py-3 rounded-full 
                            bg-gradient-to-br from-teal-400/60 to-teal-500/60 
                            backdrop-blur-sm border border-white/20
                            shadow-[0_0_10px_rgba(20,184,166,0.3)]">
                                                            <span className="text-sm font-medium text-white drop-shadow-lg">
                                                                {(activeSlide + 1).toString().padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Button - Larger size */}
                                                <button
                                                    onClick={() => handleScroll('right')}
                                                    disabled={isTransitioning}
                                                    className={`group overflow-hidden p-3.5 rounded-full 
                        transition-all duration-300 
                        bg-gradient-to-br from-white/20 to-white/5
                        hover:from-white/30 hover:to-white/10
                        active:scale-95
                        disabled:from-white/5 disabled:to-white/5
                        backdrop-blur-md
                        border border-white/20 hover:border-white/30
                        shadow-lg shadow-black/20
                        ${isTransitioning ? 'opacity-50' : 'hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}
                                                >
                                                    <span className="relative z-10 flex items-center justify-center">
                                                        <svg
                                                            className="w-5 h-5 text-white transition-all duration-300 
                                group-hover:text-white group-hover:scale-110"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2.5}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Updated Itinerary Modal */}
            {isItineraryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setIsItineraryModalOpen(false)}
                    />
                    <div className="relative z-10 bg-gradient-to-b from-blue-900/95 to-blue-950/95 
                        w-full max-w-2xl rounded-xl overflow-hidden border border-blue-500/30 shadow-2xl
                        animate-fadeIn">
                        <div className="flex justify-between items-center p-5 border-b border-blue-500/30">
                            <h3 className="text-xl font-bold text-white">
                                {destinations[activeSlide]?.tourName || currentItinerary?.nameDisplay || 'Tour'} {t('itinerary')}
                            </h3>
                            <button
                                onClick={() => setIsItineraryModalOpen(false)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {currentIsLoadingItinerary ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
                                </div>
                            ) : currentItineraryError ? (
                                <div className="text-center py-8">
                                    <p className="text-red-400">{currentItineraryError}</p>
                                    <button
                                        onClick={handleRetryItinerary}
                                        className="mt-4 px-4 py-2 bg-teal-600/30 hover:bg-teal-600/50 
                                            rounded-md text-white transition-colors duration-200"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 relative ml-3">
                                    {/* Title */}
                                    <h4 className="font-semibold text-teal-300 mb-4 flex items-center gap-2 pl-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        {t('scheduledStops')}
                                    </h4>

                                    {/* Vertical Timeline Line */}
                                    <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-gradient-to-b from-teal-500/60 via-teal-400/40 to-teal-500/20"></div>

                                    {/* Use itinerary data if available, otherwise use destinations */}
                                    {currentItinerary?.stops?.length > 0 ? (
                                        currentItinerary.stops.map((stop, index) => (
                                            <div key={index} className="relative pl-12">
                                                {/* Timeline Circle */}
                                                <div className="absolute left-1.5 top-0 w-5 h-5 rounded-full 
                                                    bg-gradient-to-br from-teal-400 to-emerald-500 
                                                    border-2 border-teal-900/80 shadow-lg shadow-teal-500/20">
                                                </div>

                                                {/* Stop Content */}
                                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 
                                                    border border-white/10 hover:border-teal-500/30 
                                                    transition-all duration-300 group">

                                                    {/* Stop Header */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <h5 className="text-lg font-semibold text-white group-hover:text-teal-300 transition-colors">
                                                                {stop.destination?.nameDisplay || `Stop ${index + 1}`}
                                                            </h5>
                                                            <p className="text-white/60 text-sm">
                                                                {stop.time || t('duration')}: 1-2 hours
                                                            </p>
                                                        </div>
                                                        <div className="bg-teal-500/20 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium text-teal-300">
                                                            {index + 1}
                                                        </div>
                                                    </div>

                                                    {/* Stop Description */}
                                                    <p className="text-white/80 leading-relaxed text-sm mb-3"
                                                        style={language === 'CN' ? { fontFamily: '"Noto Sans SC", "Noto Sans", sans-serif' } : {}}>
                                                        {stop.commentDisplay}
                                                    </p>

                                                    {/* Additional Stop Details */}
                                                    {stop.destination && (
                                                        <div className="pt-2 border-t border-white/10 mt-2 grid grid-cols-2 gap-3">
                                                            <div className="text-xs text-white/60">
                                                                <span className="block text-white/40">{t('location')}</span>
                                                                {stop.destination.location || '-'}
                                                            </div>
                                                            <div className="text-xs text-white/60">
                                                                <span className="block text-white/40">{t('bestTime')}</span>
                                                                {stop.destination.bestTime || '-'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : destinations[activeSlide]?.destinations?.length > 0 ? (
                                        // Fallback to destinations from props if API data not available
                                        destinations[activeSlide].destinations
                                            .sort((a, b) => a.position - b.position)
                                            .map((stop, index) => (
                                                // ...similar layout as above...
                                                <div key={index} className="relative pl-12">
                                                    {/* Timeline Circle */}
                                                    <div className="absolute left-1.5 top-0 w-5 h-5 rounded-full 
                                                        bg-gradient-to-br from-teal-400 to-emerald-500 
                                                        border-2 border-teal-900/80 shadow-lg shadow-teal-500/20">
                                                    </div>

                                                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 
                                                        border border-white/10 hover:border-teal-500/30 
                                                        transition-all duration-300 group">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <h5 className="text-lg font-semibold text-white group-hover:text-teal-300 transition-colors">
                                                                    {stop.destination?.name?.en || `Stop ${index + 1}`}
                                                                </h5>
                                                                <p className="text-white/60 text-sm">
                                                                    {stop.time || t('duration')}: Variable
                                                                </p>
                                                            </div>
                                                            <div className="bg-teal-500/20 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium text-teal-300">
                                                                {index + 1}
                                                            </div>
                                                        </div>

                                                        <p className="text-white/80 leading-relaxed text-sm mb-3">
                                                            {(language === 'EN' && stop.comment_en) ||
                                                                (language === 'ID' && stop.comment_id) ||
                                                                (language === 'CN' && stop.comment_cn) ||
                                                                stop.comment_en || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="text-center pt-4 pb-8">
                                            <p className="text-lg text-white/70">
                                                {t('noItinerary')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-blue-500/30 flex justify-end">
                            <button
                                onClick={() => setIsItineraryModalOpen(false)}
                                className="px-5 py-2 bg-teal-500/30 hover:bg-teal-500/50 
                                    text-white font-medium rounded-lg transition-all duration-200
                                    border border-teal-500/30 hover:border-teal-500/50"
                            >
                                {t('close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add SVG gradient definition for circle progress */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2dd4bf" />
                        <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};

export default Hero;