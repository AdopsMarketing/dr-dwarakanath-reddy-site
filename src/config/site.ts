export const siteConfig = {
  doctor: {
    name: "Dr. Dwarakanath Reddy",
    whatsapp: "918985135935",
    phone: "+91 89851 35935",
  },
  site: {
    url: "https://drdwarakanathreddy.com",
    name: "Dr. Dwarakanath Reddy",
  },
} as const;

export const whatsappUrl = (message: string) =>
  `https://wa.me/${siteConfig.doctor.whatsapp}?text=${encodeURIComponent(message)}`;
