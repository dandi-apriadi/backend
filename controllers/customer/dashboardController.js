export const getDashboard = async (req, res) => {
    try {
        res.status(200).json({
            message: "Welcome to the customer dashboard!",
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
