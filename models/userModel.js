import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import argon2 from "argon2";

const { DataTypes } = Sequelize;

// Users Model
const User = db.define('users', {
    user_id: {
        type: DataTypes.STRING,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        allowNull: false
    },
    fullname: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '-'
    },
    role: {
        type: DataTypes.ENUM('admin', 'customer', 'seller'),
        allowNull: false,
        defaultValue: 'customer'
    },
    gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
        validate: {
            isIn: [['male', 'female']]
        }
    },
    email: {
        type: DataTypes.STRING(191),
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'banned'),
        allowNull: false,
        defaultValue: 'active'
    },
    token: {
        type: DataTypes.STRING,
        defaultValue: () => uuidv4(),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
            return moment(this.getDataValue('created_at')).format('D MMMM, YYYY, h:mm A');
        }
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
            return moment(this.getDataValue('updated_at')).format('D MMMM, YYYY, h:mm A');
        }
    },
}, {
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [],
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const hashedPassword = await argon2.hash(user.password, {
                    type: argon2.argon2id,
                    memoryCost: 65536,
                    timeCost: 3,
                    parallelism: 4
                });
                user.password = hashedPassword;
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const hashedPassword = await argon2.hash(user.password, {
                    type: argon2.argon2id,
                    memoryCost: 65536,
                    timeCost: 3,
                    parallelism: 4
                });
                user.password = hashedPassword;
            }
        },
        afterCreate: (user) => {
            delete user.dataValues.password;
        },
        afterUpdate: (user) => {
            delete user.dataValues.password;
        }
    }
});

// Export only User model and relations function
export { User };
