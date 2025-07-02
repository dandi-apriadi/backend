import '@fortawesome/fontawesome-free/css/all.min.css';

const FreeCard = () => {
  return (
    <div className="relative mt-14 flex w-[256px] justify-center rounded-[20px] bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 pb-4 shadow-lg">
      <div className="absolute -top-12 flex h-24 w-24 items-center justify-center rounded-full border-[4px] border-white bg-gradient-to-b from-[#868CFF] to-brand-500">
        <i className="fab fa-whatsapp text-white text-5xl"></i>
      </div>

      <div className="mt-16 flex h-fit flex-col items-center">
        <p className="text-lg font-bold text-white">Chat via WhatsApp</p>
        <p className="mt-1 px-4 text-center text-sm text-white">
          Klik tombol di bawah untuk menghubungi kami melalui WhatsApp.
        </p>

        <a
          target="_blank"
          rel="noopener noreferrer"
          className="text-medium mt-7 block rounded-full bg-gradient-to-b from-white/50 to-white/10 py-[12px] px-11 text-center text-base text-white hover:bg-gradient-to-b hover:from-white/40 hover:to-white/5"
          href="https://wa.me/6285161542103?text=Halo%2C%20saya%20tertarik%20dengan%20layanan%20Anda!"
        >
          Kirim Pesan
        </a>
      </div>
    </div>

  );
};

export default FreeCard;
