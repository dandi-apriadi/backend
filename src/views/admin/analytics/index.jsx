import React from "react";

const Analytics = () => {
    return (
        <div className="mt-3 grid grid-cols-1 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="bg-amber-500 dark:bg-amber-600 p-6 mb-8">
                    <h6 className="text-white font-medium text-xl">
                        Analitik
                    </h6>
                </div>
                <div className="px-4 pb-4">
                    <div className="overflow-x-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Pest Detection Overview */}
                            <div className="p-4 border dark:border-gray-700 rounded-lg shadow-sm dark:bg-gray-700">
                                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Ikhtisar Deteksi Hama</h3>
                                <div className="h-64 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                    <p className="text-gray-500 dark:text-gray-300">Placeholder Grafik Deteksi Hama</p>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg">
                                        <p className="text-xs text-green-700 dark:text-green-300 font-medium">Bulan Ini</p>
                                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">42</p>
                                        <p className="text-xs text-green-700 dark:text-green-300">insiden terdeteksi</p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Bulan Sebelumnya</p>
                                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">56</p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">insiden terdeteksi</p>
                                    </div>
                                </div>
                            </div>

                            {/* Spraying Efficiency */}
                            <div className="p-4 border dark:border-gray-700 rounded-lg shadow-sm dark:bg-gray-700">
                                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Efisiensi Penyemprotan</h3>
                                <div className="h-64 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                    <p className="text-gray-500 dark:text-gray-300">Placeholder Grafik Efisiensi</p>
                                </div>
                                <div className="mt-4 bg-purple-50 dark:bg-purple-900 p-3 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Cakupan Rata-rata</p>
                                        <p className="text-sm font-bold text-purple-800 dark:text-purple-200">92%</p>
                                    </div>
                                    <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-2.5 mt-2">
                                        <div className="bg-purple-600 dark:bg-purple-400 h-2.5 rounded-full" style={{ width: '92%' }}></div>
                                    </div>
                                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Naik 8% dari bulan lalu</p>
                                </div>
                            </div>
                        </div>

                        {/* Resource Usage */}
                        <div className="p-4 border dark:border-gray-700 rounded-lg shadow-sm mb-6 dark:bg-gray-700">
                            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Penggunaan Sumber Daya</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Penggunaan Pestisida</h4>
                                        <span className="text-xs font-medium text-green-600 dark:text-green-400">-12% YTD</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">245 L</p>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-3">
                                        <div className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">65% dari anggaran tahunan</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Konsumsi Energi</h4>
                                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">+3% YTD</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">1,230 kWh</p>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-3">
                                        <div className="bg-amber-500 dark:bg-amber-400 h-1.5 rounded-full" style={{ width: '78%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">78% dari anggaran tahunan</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Konsumsi Air</h4>
                                        <span className="text-xs font-medium text-green-600 dark:text-green-400">-8% YTD</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">5,280 L</p>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-3">
                                        <div className="bg-green-500 dark:bg-green-400 h-1.5 rounded-full" style={{ width: '42%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">42% dari anggaran tahunan</p>
                                </div>
                            </div>
                        </div>

                        {/* Historical Performance */}
                        <div className="p-4 border dark:border-gray-700 rounded-lg shadow-sm dark:bg-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Kinerja Historis</h3>
                                <select className="text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-md">
                                    <option>6 Bulan Terakhir</option>
                                    <option>Tahun Lalu</option>
                                    <option>2 Tahun Terakhir</option>
                                </select>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bulan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Deteksi Hama</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kegiatan Penyemprotan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Efisiensi</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Penggunaan Sumber Daya</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">September</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">42</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">12</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">92%</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Rendah</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Agustus</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">56</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">18</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">85%</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Sedang</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Juli</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">78</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">24</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">76%</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Tinggi</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-right">
                                <button className="px-4 py-2 bg-amber-500 dark:bg-amber-600 text-white rounded-lg hover:bg-amber-600 text-sm font-medium transition-colors duration-150">
                                    Unduh Laporan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
