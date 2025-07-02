import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import SequelizeStore from "connect-session-sequelize";
import helmet from "helmet";
import db from "./config/Database.js";
import AllRoutes from "./routes/routes-backend.js";
dotenv.config();

// Pastikan app dideklarasikan sebelum dipakai
const app = express();

app.use(
    cors({
        credentials: true,
        origin: process.env.CLIENT_ORIGIN || "http://localhost:3001",
    })
);

const sessionStore = SequelizeStore(session.Store);

// Create session store with database
const store = new sessionStore({
    db: db,
});

// Middleware
app.use(helmet()); // Security headers
app.use(express.json()); // Parse JSON bodies
app.use(express.static("public")); // Serve static files

app.use(
    fileUpload({
        limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB
        abortOnLimit: true,
        responseOnLimit: "File terlalu besar",
        createParentPath: true,
        useTempFiles: true,
        tempFileDir: "/tmp/",
        preserveExtension: true,
        safeFileNames: true,
    })
);

// Session Configuration
app.use(
    session({
        secret: process.env.SESS_SECRET || "default_secret_key",
        resave: false,
        saveUninitialized: true,
        store: store,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        },
    })
);

// Database initialization
const initDatabase = async () => {
    try {
        await db.authenticate();
        console.log('Database connection established.');

        // Drop existing indexes
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        try {
            await db.query('DROP INDEX users_email_unique ON users');
        } catch (err) { } // Ignore if index doesn't exist

        // Sync with minimal configuration
        await db.sync({
            force: false,
            alter: true,
            hooks: false
        });

        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Database synchronized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        return false;
    }
};

const PORT = process.env.PORT || 5001;

// Wrap server initialization in IIFE
(async () => {
    try {
        const dbInitialized = await initDatabase();

        if (!dbInitialized) {
            console.error('Failed to initialize database');
            process.exit(1);
        }

        // Routes
        app.use(AllRoutes);
        // Global error handler
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ message: "Internal Server Error" });
        });

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server initialization failed:', error);
        process.exit(1);
    }
})();
