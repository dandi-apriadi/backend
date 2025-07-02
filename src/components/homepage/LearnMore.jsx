import React, { useState, useEffect } from 'react'; // Add useEffect

// Add isVisible prop and update main container
const LearnMore = ({ activeSlide, tourData, onClose, isVisible }) => {
    // Add state for tracking featured image index
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0); // Add this to your existing state declarations

    // Add dependency array to prevent infinite updates
    useEffect(() => {
        setFeaturedIndex(0); // Reset featured index when active slide changes
        setActiveImageIndex(0); // Reset active image index
    }, [activeSlide]);

    // Add close animation handler
    const handleClose = () => {
        // Add closing animation class
        const element = document.getElementById('learn-more-content');
        element.classList.add('animate-closeContent');

        // Wait for animation to complete before closing
        setTimeout(() => {
            onClose();
            element.classList.remove('animate-closeContent');
        }, 500);
    };

    // Update the adaptiveStyles object with simpler, more efficient styles
    const adaptiveStyles = {
        container: `bg-black/90 backdrop-blur-sm`,
        text: 'text-white',
        subtext: 'text-gray-200',
        border: 'border-white/10',
        iconBg: 'bg-black/60'
    };

    // Update the getGridPosition function
    const getGridPosition = (index, featuredIndex) => {
        // Base positions for the grid layout
        const positions = {
            0: { normal: 'col-span-2 row-span-2 left-0 top-0', featured: 'col-span-2 row-span-2 left-0 top-0' },
            1: { normal: 'right-0 top-0', featured: 'col-span-2 row-span-2 left-0 top-0' },
            2: { normal: 'right-0 top-1/4', featured: 'col-span-2 row-span-2 left-0 top-0' },
            3: { normal: 'right-0 top-2/4', featured: 'col-span-2 row-span-2 left-0 top-0' },
            4: { normal: 'right-0 top-3/4', featured: 'col-span-2 row-span-2 left-0 top-0' },
            5: { normal: 'right-0 bottom-0', featured: 'col-span-2 row-span-2 left-0 top-0' }
        };

        return index === featuredIndex
            ? positions[index].featured
            : positions[index].normal;
    };

    // Add image styles helper
    const getImageStyles = (index, featuredIndex) => {
        return {
            transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `${index === featuredIndex ? 'scale(1)' : 'scale(0.95)'}`,
            ...(index === featuredIndex
                ? { width: '66.666667%', height: '66.666667%' }
                : { width: '33.333333%', height: '33.333333%' }
            )
        };
    };

    // Click handler for images
    const handleImageClick = (index) => {
        setFeaturedIndex(index);
    };

    return (
        <div className="relative w-full">
            <div
                id="learn-more-content"
                className={`transform transition-all duration-300 ease-out
          ${isVisible
                        ? 'translate-y-0 opacity-100 animate-slideDownEnter'
                        : 'translate-y-full opacity-0'}`}
            >
                {/* Glossy header background - Enhanced design */}
                <div className="relative w-full h-20 mb-8">
                    {/* Multi-layer background */}
                    <div className="absolute inset-0">
                        {/* Base layer with gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r 
                        from-black/95 via-black/90 to-black/95" />

                        {/* Glossy overlay */}
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-gradient-to-b 
                            from-white/10 via-white/5 to-transparent 
                            backdrop-blur-xl" />

                            {/* Subtle grid pattern */}
                            <div className="absolute inset-0 opacity-5"
                                style={{
                                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
                                    backgroundSize: '20px 20px'
                                }}
                            />
                        </div>

                        {/* Border highlights */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r 
                        from-transparent via-teal-500/30 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r 
                        from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Additional decorative elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Corner ornaments - Top Left */}
                        <div className="absolute top-0 left-0 w-32 h-32">
                            <div className="absolute top-4 left-4 w-2 h-2 rounded-full 
                            bg-teal-500/30 blur-[1px] animate-pulse" />
                            <div className="absolute top-6 left-8 w-1 h-1 rounded-full 
                            bg-teal-400/40" />
                            <div className="absolute top-8 left-4 w-1 h-1 rounded-full 
                            bg-teal-400/40" />
                        </div>

                        {/* Corner ornaments - Top Right */}
                        <div className="absolute top-0 right-0 w-32 h-32">
                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full 
                            bg-teal-500/30 blur-[1px] animate-pulse" />
                            <div className="absolute top-6 right-8 w-1 h-1 rounded-full 
                            bg-teal-400/40" />
                            <div className="absolute top-8 right-4 w-1 h-1 rounded-full 
                            bg-teal-400/40" />
                        </div>

                        {/* Floating particles */}
                        {[...Array(12)].map((_, i) => (
                            <div key={i}
                                className={`absolute w-1 h-1 rounded-full 
                                bg-teal-500/${15 + (i * 5)} 
                                animate-float-${['slow', 'medium', 'fast'][i % 3]} 
                                delay-${i * 150}`}
                                style={{
                                    left: `${10 + (i * 7)}%`,
                                    top: `${i % 2 === 0 ? 25 : 65}%`
                                }}
                            />
                        ))}

                        {/* Center decoration */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="relative w-[700px]">
                                {/* Horizontal lines */}
                                <div className="absolute top-1/2 -translate-y-1/2 w-full">
                                    <div className="h-[1px] w-full bg-gradient-to-r 
                                    from-transparent via-teal-500/40 to-transparent" />
                                    <div className="h-[1px] w-3/4 mx-auto mt-1 bg-gradient-to-r 
                                    from-transparent via-teal-500/20 to-transparent" />
                                </div>

                                {/* Center dots */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                                flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500/50 
                                    shadow-[0_0_8px_rgba(20,184,166,0.3)] animate-pulse" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500/60 
                                    shadow-[0_0_12px_rgba(20,184,166,0.4)]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500/50 
                                    shadow-[0_0_8px_rgba(20,184,166,0.3)] animate-pulse delay-300" />
                                </div>
                            </div>
                        </div>

                        {/* Side decorations */}
                        <div className="absolute inset-y-0 left-16 flex flex-col justify-center gap-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <div className={`w-${2 - (i * 0.5)} h-${2 - (i * 0.5)} rounded-full 
                                    bg-teal-500/${40 - (i * 10)} 
                                    shadow-[0_0_${10 - (i * 2)}px_rgba(20,184,166,0.3)]`} />
                                    <div className={`w-${16 - (i * 4)} h-[1px] 
                                    bg-gradient-to-r from-teal-500/${30 - (i * 5)} to-transparent`} />
                                </div>
                            ))}
                        </div>

                        {/* Mirror side decorations */}
                        <div className="absolute inset-y-0 right-16 flex flex-col justify-center gap-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex gap-2 items-center flex-row-reverse">
                                    <div className={`w-${2 - (i * 0.5)} h-${2 - (i * 0.5)} rounded-full 
                                    bg-teal-500/${40 - (i * 10)} 
                                    shadow-[0_0_${10 - (i * 2)}px_rgba(20,184,166,0.3)]`} />
                                    <div className={`w-${16 - (i * 4)} h-[1px] 
                                    bg-gradient-to-l from-teal-500/${30 - (i * 5)} to-transparent`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Enhanced decorative elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Star-like particles with enhanced visibility */}
                        {[...Array(24)].map((_, i) => (
                            <div
                                key={i}
                                className={`absolute w-${i % 3 + 1} h-${i % 3 + 1} rounded-full
                                bg-teal-400/${40 + (i % 3) * 20}
                                animate-twinkle-${['slow', 'medium', 'fast'][i % 3]}
                                shadow-[0_0_8px_rgba(20,184,166,0.4)]
                                delay-${i * 100}`}
                                style={{
                                    left: `${5 + (i * 4)}%`,
                                    top: `${10 + ((i % 4) * 20)}%`,
                                    filter: `blur(${i % 2 ? '0px' : '1px'})`
                                }}
                            />
                        ))}

                        {/* Enhanced corner decorations */}
                        <div className="absolute top-0 left-0 w-40 h-40">
                            <div className="absolute top-4 left-4 w-4 h-4 rounded-full 
                            bg-teal-400/60 blur-[1px] animate-pulse-glow" />
                            <div className="absolute top-8 left-8 w-2 h-2 rounded-full 
                            bg-teal-300/80 animate-twinkle-medium" />
                            <div className="absolute top-6 left-12 w-1.5 h-1.5 rounded-full 
                            bg-teal-400/70 animate-float-slow" />
                            {/* Decorative line */}
                            <div className="absolute top-6 left-6 w-16 h-[1px]
                            bg-gradient-to-r from-teal-400/60 to-transparent" />
                        </div>

                        {/* Mirror corner decorations */}
                        <div className="absolute top-0 right-0 w-40 h-40">
                            <div className="absolute top-4 right-4 w-4 h-4 rounded-full 
                            bg-teal-400/60 blur-[1px] animate-pulse-glow" />
                            <div className="absolute top-8 right-8 w-2 h-2 rounded-full 
                            bg-teal-300/80 animate-twinkle-medium" />
                            <div className="absolute top-6 right-12 w-1.5 h-1.5 rounded-full 
                            bg-teal-400/70 animate-float-slow" />
                            {/* Decorative line */}
                            <div className="absolute top-6 right-6 w-16 h-[1px]
                            bg-gradient-to-l from-teal-400/60 to-transparent" />
                        </div>

                        {/* Enhanced center ornament */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="relative">
                                {/* Glowing background */}
                                <div className="absolute -inset-12 bg-teal-500/10 rounded-full blur-xl animate-pulse-subtle" />

                                {/* Central elements */}
                                <div className="relative flex items-center justify-center">
                                    {/* Main horizontal line */}
                                    <div className="absolute w-[600px] h-[1px] bg-gradient-to-r 
                                    from-transparent via-teal-400/70 to-transparent" />

                                    {/* Central dots */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-teal-400/80 
                                        shadow-[0_0_12px_rgba(45,212,191,0.6)] animate-twinkle-slow" />
                                        <div className="w-3 h-3 rounded-full bg-teal-400/90 
                                        shadow-[0_0_15px_rgba(45,212,191,0.7)] animate-pulse-glow" />
                                        <div className="w-2 h-2 rounded-full bg-teal-400/80 
                                        shadow-[0_0_12px_rgba(45,212,191,0.6)] animate-twinkle-slow" />
                                    </div>

                                    {/* Orbiting particles */}
                                    <div className="absolute inset-0 animate-spin-slow">
                                        {[...Array(8)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute w-1.5 h-1.5 rounded-full bg-teal-300/60
                                                shadow-[0_0_8px_rgba(45,212,191,0.4)]"
                                                style={{
                                                    transform: `rotate(${i * 45}deg) translateX(32px)`
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced side decorations */}
                        <div className="absolute inset-y-0 left-20 flex flex-col justify-center gap-8">
                            {[...Array(3)].map((_, i) => (
                                <div key={i}
                                    className="group flex gap-4 items-center 
                                    animate-pulse-subtle hover:scale-110 transition-transform duration-300"
                                >
                                    <div className={`w-${4 - i} h-${4 - i} rounded-full 
                                    bg-teal-400/${60 - (i * 10)}
                                    shadow-[0_0_15px_rgba(45,212,191,0.4)]
                                    group-hover:shadow-[0_0_20px_rgba(45,212,191,0.6)]
                                    transition-all duration-300`}
                                    />
                                    <div className="h-[2px] w-20 bg-gradient-to-r from-teal-400/60 to-transparent" />
                                </div>
                            ))}
                        </div>

                        {/* Mirror side decorations */}
                        <div className="absolute inset-y-0 right-20 flex flex-col justify-center gap-8">
                            {[...Array(3)].map((_, i) => (
                                <div key={i}
                                    className="group flex gap-4 items-center flex-row-reverse
                                    animate-pulse-subtle hover:scale-110 transition-transform duration-300"
                                >
                                    <div className={`w-${4 - i} h-${4 - i} rounded-full 
                                    bg-teal-400/${60 - (i * 10)}
                                    shadow-[0_0_15px_rgba(45,212,191,0.4)]
                                    group-hover:shadow-[0_0_20px_rgba(45,212,191,0.6)]
                                    transition-all duration-300`}
                                    />
                                    <div className="h-[2px] w-20 bg-gradient-to-l from-teal-400/60 to-transparent" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Modern decorative elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Floating orbs with modern glow */}
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className={`absolute w-${i % 4 + 2} h-${i % 4 + 2} rounded-full
                                bg-gradient-to-r from-teal-400/${30 + (i % 3) * 20} to-cyan-400/${20 + (i % 3) * 20}
                                animate-float-${['slow', 'medium', 'fast'][i % 3]}
                                shadow-[0_0_15px_rgba(45,212,191,0.3)]
                                backdrop-blur-[2px]
                                delay-${i * 100}`}
                                style={{
                                    left: `${5 + (i * 3)}%`,
                                    top: `${10 + ((i % 5) * 15)}%`,
                                    filter: `blur(${i % 2 ? '1px' : '0px'})`,
                                    transform: `scale(${1 + (i % 3) * 0.2})`
                                }}
                            />
                        ))}

                        {/* Modern geometric patterns */}
                        <div className="absolute inset-0">
                            <div className="absolute h-full w-[1px] left-[20%] bg-gradient-to-b from-transparent via-teal-400/30 to-transparent" />
                            <div className="absolute h-full w-[1px] right-[20%] bg-gradient-to-b from-transparent via-teal-400/30 to-transparent" />
                            <div className="absolute w-full h-[1px] top-0 bg-gradient-to-r from-transparent via-teal-400/20 to-transparent" />
                        </div>

                        {/* Enhanced center decoration */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="relative">
                                {/* Animated rings */}
                                <div className="absolute -inset-16 animate-spin-slow opacity-20">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`absolute inset-0 border-2 border-teal-400/${50 - i * 15} rounded-full
                                            animate-pulse-${['slow', 'medium', 'fast'][i]}`}
                                            style={{ transform: `scale(${1 + i * 0.2})` }}
                                        />
                                    ))}
                                </div>

                                {/* Central glow effect */}
                                <div className="relative">
                                    <div className="absolute -inset-8 bg-teal-400/10 rounded-full blur-xl animate-pulse-subtle" />
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400
                                        shadow-[0_0_20px_rgba(45,212,191,0.5)] animate-pulse-bright" />
                                    </div>
                                </div>

                                {/* Orbiting particles */}
                                <div className="absolute inset-0">
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-1.5 h-1.5 rounded-full
                                            bg-gradient-to-r from-teal-400/60 to-cyan-400/60
                                            animate-orbit"
                                            style={{
                                                transformOrigin: 'center',
                                                transform: `rotate(${i * 30}deg) translateX(40px)`
                                            }}
                                        >
                                            <div className="absolute inset-0 animate-twinkle-slow" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modern side accents */}
                        {[...Array(2)].map((_, side) => (
                            <div
                                key={side}
                                className={`absolute inset-y-0 ${side === 0 ? 'left-12' : 'right-12'} 
                                flex flex-col justify-center gap-8`}
                            >
                                {[...Array(3)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`group flex items-center ${side === 0 ? '' : 'flex-row-reverse'} gap-4
                                        hover:scale-110 transition-all duration-500 ease-out`}
                                    >
                                        <div className={`w-${5 - i} h-${5 - i} rounded-full 
                                        bg-gradient-to-r ${side === 0
                                                ? 'from-teal-400/50 to-cyan-400/30'
                                                : 'from-cyan-400/30 to-teal-400/50'}
                                        shadow-[0_0_15px_rgba(45,212,191,0.3)]
                                        group-hover:shadow-[0_0_25px_rgba(45,212,191,0.5)]
                                        animate-pulse-${['slow', 'medium', 'fast'][i]}`}
                                        />
                                        <div className={`h-[2px] w-24 
                                        bg-gradient-to-${side === 0 ? 'r' : 'l'} 
                                        from-teal-400/40 to-transparent
                                        group-hover:from-teal-400/60`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Enhanced close button with better visibility */}
                    <button
                        onClick={handleClose}
                        className="absolute top-1/2 right-8 -translate-y-1/2 p-3
                        rounded-full 
                        bg-gradient-to-br from-white/15 to-white/5
                        backdrop-blur-lg 
                        border border-white/20
                        shadow-[0_0_15px_rgba(0,0,0,0.3)]
                        hover:bg-white/15 
                        hover:border-white/30
                        hover:shadow-[0_0_20px_rgba(20,184,166,0.2)]
                        transition-all duration-300 
                        group
                        active:scale-90"
                    >
                        <svg
                            className="w-5 h-5 text-white transition-all duration-300 
                            group-hover:scale-110 group-hover:text-teal-50
                            drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>

                        {/* Added hover tooltip */}
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2
                        px-2 py-1 text-xs font-medium text-white/90
                        bg-black/50 backdrop-blur-md rounded-md
                        border border-white/10
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-300
                        whitespace-nowrap">
                            Close Details
                        </span>
                    </button>

                    {/* Enhanced title */}
                    <div className="absolute top-1/2 left-8 -translate-y-1/2
                    text-white/90 font-medium tracking-wide text-lg">
                        Tour Details
                    </div>
                </div>

                {/* Background Image with Overlay */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute inset-0 transition-all duration-700 ease-in-out bg-black">
                        <img
                            src={tourData?.bgImage || ''}
                            alt={tourData?.tourName || 'Background'}
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                            crossOrigin="anonymous"
                            loading="eager"
                            onError={(e) => {
                                e.target.style.opacity = 0;
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black/95 backdrop-blur-sm" />
                    </div>
                </div>

                {/* Background Decorative Elements */}
                <div className="absolute inset-0 overflow-hidden -z-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
                </div>

                <div className="mx-auto px-4 relative ">
                    <div className="flex flex-col lg:flex-row gap-16">
                        {/* Left Content - Gallery Section */}
                        <div className="lg:w-1/2" data-aos="fade-right">
                            {/* Glossy Gallery Container */}
                            <div className="relative p-8 rounded-3xl overflow-hidden">
                                {/* Glossy background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 
                                backdrop-blur-xl rounded-3xl border border-white/10 
                                shadow-[0_0_30px_rgba(0,0,0,0.3)]"
                                />

                                {/* Decorative elements */}
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute top-0 left-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
                                    <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-600/10 rounded-full blur-3xl" />
                                </div>

                                {/* Gallery Content */}
                                <div className="relative space-y-6">
                                    {/* Section Title */}
                                    <div className="flex items-center gap-2">
                                        <span className="relative inline-flex items-center gap-2 px-5 py-2.5
                                        before:absolute before:inset-0 before:bg-white/10 
                                        before:backdrop-blur-sm before:rounded-full before:-z-10
                                        after:absolute after:inset-0 after:bg-gradient-to-r 
                                        after:from-teal-500/50 after:to-teal-600/50 
                                        after:rounded-full after:-z-20 
                                        text-sm font-medium text-white"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Photo Gallery
                                        </span>
                                    </div>

                                    {/* Modern Gallery Grid */}
                                    <div className="grid grid-cols-3 grid-rows-3 gap-4 h-[600px]">
                                        {/* Featured Image */}
                                        <div className="relative col-span-2 row-span-2 rounded-2xl overflow-hidden group">
                                            <img
                                                src={tourData?.gallery?.[activeImageIndex]?.url || tourData?.bgImage}
                                                alt={`${tourData?.tourName} - Featured`}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                loading="eager"
                                                crossOrigin="anonymous"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t 
                                                from-black/60 via-black/20 to-transparent 
                                                group-hover:from-black/40 group-hover:via-black/10 
                                                transition-all duration-500"
                                            />

                                            {/* Image Counter */}
                                            <div className="absolute top-4 left-4 flex items-center gap-2">
                                                <span className="px-3 py-1.5 rounded-full text-sm font-medium 
                                                    bg-teal-500/80 backdrop-blur-sm text-white
                                                    border border-white/20">
                                                    Image {activeImageIndex + 1} of {tourData?.gallery?.length || 0}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Gallery Thumbnails */}
                                        {tourData?.gallery?.map((image, index) => (
                                            <div
                                                key={image.id}
                                                onClick={() => setActiveImageIndex(index)}
                                                className={`relative rounded-xl overflow-hidden cursor-pointer group
                                                    transform transition-all duration-500
                                                    hover:shadow-[0_0_30px_rgba(20,184,166,0.3)]
                                                    ${activeImageIndex === index ? 'ring-2 ring-teal-500' : ''}
                                                    hover:-translate-y-1`}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={`${tourData?.tourName} - View ${index + 1}`}
                                                    className={`w-full h-full object-cover transition-transform duration-500
                                                        group-hover:scale-110 ${activeImageIndex === index ? 'brightness-110' : 'brightness-75'}`}
                                                    loading="lazy"
                                                    crossOrigin="anonymous"
                                                />
                                                <div className={`absolute inset-0 bg-gradient-to-t 
                                                    from-black/60 via-black/20 to-transparent 
                                                    group-hover:from-black/40 group-hover:via-black/10 
                                                    transition-all duration-500
                                                    ${activeImageIndex === index ? 'opacity-50' : 'opacity-100'}`}
                                                />

                                                {/* Image Indicators */}
                                                <div className="absolute top-2 left-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                                        backdrop-blur-sm border border-white/10
                                                        ${activeImageIndex === index ? 'bg-teal-500/50 text-white' : 'bg-black/50 text-white/90'}`}>
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                {image.isMain && (
                                                    <div className="absolute top-2 right-2">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium 
                                                            bg-teal-500/50 backdrop-blur-sm text-white border border-white/20">
                                                            Main
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Content - Enhanced Info */}
                        <div className="lg:w-1/2 text-white" data-aos="fade-left">
                            <div className="relative p-8 rounded-3xl overflow-hidden">
                                {/* Static glossy background */}
                                <div className={`absolute inset-0 ${adaptiveStyles.container} 
                                rounded-3xl border ${adaptiveStyles.border} 
                                shadow-[0_0_30px_rgba(0,0,0,0.4)]`}
                                />

                                {/* Add consistent blur overlay */}
                                <div className="absolute inset-0 backdrop-blur-xl 
                                bg-gradient-to-br from-black/20 to-black/10 
                                rounded-3xl"
                                />

                                {/* Content wrapper */}
                                <div className="relative space-y-10">
                                    {/* Title and Category */}
                                    <div className="space-y-4">
                                        <span className="relative inline-flex items-center gap-2 px-5 py-2.5
                                            bg-black/80 backdrop-blur-sm rounded-full
                                            border border-white/20 text-sm font-medium text-white">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {tourData?.category}
                                        </span>
                                        <h2 className="text-5xl font-bold tracking-tight text-white">
                                            {tourData?.tourName}
                                        </h2>
                                    </div>

                                    {/* Description */}
                                    <div className="prose prose-lg">
                                        <p className="text-white/90 text-lg leading-relaxed">
                                            {tourData?.description}
                                        </p>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-8">
                                        {[
                                            {
                                                title: "Opening Hours",
                                                value: JSON.parse(tourData?.details?.opening_hours || '{}'),
                                                icon: "clock"
                                            },
                                            {
                                                title: "Entry Fee",
                                                value: JSON.parse(tourData?.details?.entry_fee || '{}'),
                                                icon: "ticket"
                                            },
                                            {
                                                title: "Best Time",
                                                value: tourData?.details?.best_time,
                                                icon: "sun"
                                            },
                                            {
                                                title: "Location",
                                                value: tourData?.details?.location,
                                                icon: "location"
                                            }
                                        ].map((item, index) => (
                                            <div key={index} className="space-y-3 group">
                                                <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                                                    <span className="w-8 h-8 rounded-full bg-black/60 
                                                    flex items-center justify-center backdrop-blur-sm">
                                                        {getIcon(item.icon)}
                                                    </span>
                                                    {item.title}
                                                </h3>
                                                {item.title === "Opening Hours" ? (
                                                    <p className="text-white/90">
                                                        {item.value?.day || 'N/A'}<br />
                                                        {item.value?.open && item.value?.close ? `${item.value.open} - ${item.value.close}` : 'N/A'}
                                                    </p>
                                                ) : item.title === "Entry Fee" ? (
                                                    <p className="text-white/90">
                                                        {(() => {
                                                            try {
                                                                const touristFee = item.value?.tourist;
                                                                if (touristFee === undefined || touristFee === null) return 'N/A';
                                                                return Number(touristFee) === 0 ?
                                                                    "Free Entry" :
                                                                    `IDR ${Number(touristFee).toLocaleString()}`;
                                                            } catch (error) {
                                                                console.error('Error processing entry fee:', error);
                                                                return 'N/A';
                                                            }
                                                        })()}
                                                    </p>
                                                ) : (
                                                    <p className="text-white/90">{item.value || 'N/A'}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Enhanced Contact Button */}
                                    <button
                                        onClick={() => {
                                            const message = `Hi, I would like to know more about ${tourData?.tourName}.`;
                                            const phoneNumber = '6282195818007';
                                            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                                            window.open(whatsappUrl, '_blank');
                                        }}
                                        className="group relative inline-flex items-center gap-2 px-8 py-4
                                        before:absolute before:inset-0 before:bg-gradient-to-r 
                                        before:from-teal-500 before:to-teal-600
                                        before:rounded-full before:-z-10 
                                        before:transition-all before:duration-300
                                        hover:before:brightness-125
                                        text-white font-medium
                                        transform transition-all duration-300 
                                        hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]
                                        hover:-translate-y-0.5"
                                    >
                                        <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                                            fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17 8h2a2 0 012 2v6a2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                        </svg>
                                        Contact for Booking
                                        <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function for icons
const getIcon = (name) => {
    const icons = {
        clock: (
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        ticket: (
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
        ),
        sun: (
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        location: (
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )
    };
    return icons[name] || null;
};

export default LearnMore;