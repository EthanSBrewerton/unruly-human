"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

const heroImages = [
  "/images/hero_lifestyle.jpg",
  "/images/pattern_detail.jpg", 
  "/images/DSC01001.jpg",
];

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const [isHovered, setIsHovered] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("M");
  const [isLoading, setIsLoading] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: selectedSize }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-rotate hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main ref={containerRef} className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center mix-blend-difference"
      >
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo-white.png"
            alt="Unruly Human"
            width={32}
            height={40}
            className="invert-0"
          />
          <span className="text-xl tracking-[0.3em] font-light">UNRULY HUMAN</span>
        </div>
        <a
          href="#buy"
          className="text-sm tracking-[0.2em] hover:opacity-60 transition-opacity"
        >
          SHOP
        </a>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Slideshow Background */}
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <Image
                src={heroImages[currentImage]}
                alt="Alloy 000 Bomber Jacket"
                fill
                className="object-cover object-center"
                priority
              />
            </motion.div>
          </AnimatePresence>
          {/* Stronger overlay for text contrast */}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
        </div>

        {/* Text with backdrop and shadow for readability */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative z-10 text-center px-6"
        >
          <h1 
            className="text-6xl md:text-8xl font-extralight tracking-[0.2em] mb-4"
            style={{ 
              textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)'
            }}
          >
            ALLOY 000
          </h1>
          <p 
            className="text-lg md:text-xl font-light tracking-[0.15em] text-white/90"
            style={{ 
              textShadow: '0 2px 10px rgba(0,0,0,0.8)'
            }}
          >
            WEARABLE ART • LIMITED EDITION
          </p>
        </motion.div>

        {/* Slideshow indicators */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentImage ? 'bg-white w-8' : 'bg-white/40'
              }`}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-16 bg-gradient-to-b from-white/60 to-transparent"
          />
        </motion.div>
      </motion.section>

      {/* Statement Section */}
      <section className="py-32 px-6 md:px-12 max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-2xl md:text-4xl font-extralight leading-relaxed tracking-wide text-center"
        >
          Each jacket is a canvas — hours of hand-drawn biomechanical artwork
          transformed into luxury fashion.
          <span className="text-white/50"> Made in England. Made to last.</span>
        </motion.p>
      </section>

      {/* Detail Section */}
      <section className="relative py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative aspect-[3/4] md:aspect-auto md:h-[80vh] overflow-hidden"
          >
            <Image
              src="/images/pattern_detail.jpg"
              alt="Alloy 000 Pattern Detail"
              fill
              className="object-cover scale-150 object-center"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center p-12 md:p-20"
          >
            <h2 className="text-sm tracking-[0.3em] text-white/50 mb-6">
              THE PATTERN
            </h2>
            <h3 className="text-3xl md:text-5xl font-extralight tracking-wide mb-8">
              Chaos in Every Thread
            </h3>
            <p className="text-lg text-white/70 leading-relaxed mb-8">
              The Alloy 000 pattern is a dense ecosystem of mechanical forms —
              turbines, pistons, gears, and organic chaos interlocking in
              endless detail. Zoom in anywhere and discover something new.
            </p>
            <ul className="space-y-4 text-white/60">
              <li className="flex items-center gap-4">
                <span className="w-8 h-px bg-white/30" />
                Quilted Jersey lining
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-px bg-white/30" />
                YKK zippers throughout
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-px bg-white/30" />
                Manufactured in England
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Craftsmanship Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative aspect-square overflow-hidden"
          >
            <Image
              src="/images/pocket_detail.jpg"
              alt="Alloy 000 Pocket Detail"
              fill
              className="object-cover"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative aspect-square overflow-hidden"
          >
            <Image
              src="/images/DSC01001.jpg"
              alt="Alloy 000 Bomber Jacket"
              fill
              className="object-cover object-top"
            />
          </motion.div>
        </div>
      </section>

      {/* Buy Section */}
      <section id="buy" className="py-32 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-sm tracking-[0.3em] text-white/50 mb-6">
              LIMITED STOCK
            </h2>
            <h3 className="text-4xl md:text-6xl font-extralight tracking-wide mb-4">
              $300
            </h3>
            <p className="text-white/50 mb-8">Free shipping worldwide</p>

            {/* Size Selector */}
            <div className="flex justify-center gap-3 mb-12">
              {["S", "M", "L", "XL", "XXL"].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`w-12 h-12 border transition-all duration-200 text-sm tracking-wider ${
                    selectedSize === size
                      ? "border-white bg-white text-black"
                      : "border-white/30 hover:border-white/60"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <motion.button
              onClick={handleCheckout}
              disabled={isLoading}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative px-16 py-5 border border-white/30 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <motion.span
                initial={{ x: "-100%" }}
                animate={{ x: isHovered && !isLoading ? "0%" : "-100%" }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white"
              />
              <span className="relative z-10 text-sm tracking-[0.3em] group-hover:text-black transition-colors duration-300">
                {isLoading ? "LOADING..." : "PURCHASE NOW"}
              </span>
            </motion.button>

            {/* Size Guide Link - Moved below Purchase button */}
            <button
              onClick={() => setShowSizeGuide(true)}
              className="w-full text-sm tracking-[0.2em] text-white/50 hover:text-white transition-colors mt-10 underline underline-offset-4"
            >
              VIEW SIZE GUIDE
            </button>

            <p className="mt-8 text-sm text-white/30">
              Secure checkout powered by Stripe
            </p>
          </motion.div>
        </div>
      </section>

      {/* Artist Section */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-sm tracking-[0.3em] text-white/50 mb-6">
                THE ARTIST
              </h2>
              <h3 className="text-3xl font-extralight tracking-wide mb-6">
                Ethan S. Brewerton
              </h3>
              <p className="text-white/60 leading-relaxed">
                Freelance illustrator specializing in biomechanical monsters and
                highly detailed patterns. Creator of Mecha Chaotic. Based in
                Connecticut.
              </p>
            </div>
            <div className="text-right">
              <a
                href="https://instagram.com/UnrulyHumanFashion"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm tracking-[0.2em] text-white/50 hover:text-white transition-colors"
              >
                @UNRULYHUMANFASHION
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-sm tracking-[0.2em] text-white/30">
            <Image
              src="/images/logo-white.png"
              alt="Unruly Human"
              width={24}
              height={30}
              className="opacity-30"
            />
            © 2025 UNRULY HUMAN
          </div>
          <div className="flex gap-8 text-sm tracking-[0.15em] text-white/50">
            <a href="#" className="hover:text-white transition-colors">
              SHIPPING
            </a>
            <a href="#" className="hover:text-white transition-colors">
              RETURNS
            </a>
            <a href="#" className="hover:text-white transition-colors">
              CONTACT
            </a>
          </div>
        </div>
      </footer>

      {/* Size Guide Modal */}
      <AnimatePresence>
        {showSizeGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSizeGuide(false)}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full bg-white border border-gray-200 px-6 pb-6 pt-11 md:px-8 md:pb-8 md:pt-[52px] cursor-default my-8"
            >
              {/* Close button */}
              <button
                onClick={() => setShowSizeGuide(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors text-2xl leading-none z-10"
              >
                ×
              </button>

              {/* Title */}
              <h3 className="text-2xl md:text-3xl font-extralight tracking-wide mb-8 text-center text-gray-900">
                SIZE GUIDE
              </h3>

              {/* Measurement Guide - images with 30px spacing */}
              <div className="mb-0">
                <Image
                  src="/measurement-guide-1.png"
                  alt="How to measure chest and length"
                  width={468}
                  height={624}
                  className="w-full h-auto block max-h-[40vh] object-contain mb-[30px]"
                  priority
                />
                <Image
                  src="/size-guide.png"
                  alt="Size Guide - Men's and Women's measurements for Chest, Waist, and Sleeve Length"
                  width={468}
                  height={854}
                  className="w-full h-auto block max-h-[50vh] object-contain"
                  priority
                />
              </div>

              {/* Helper text */}
              <p className="text-center text-sm text-gray-500 tracking-wide">
                Measurements are in inches. For best fit, measure a jacket you already own.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
