import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import moment from "moment"; // Re-enabled: Used in date getters
import { v4 as uuidv4 } from "uuid"; // To generate user_id and token
import argon2 from "argon2"; // Re-enabled: Used in password hashing hooks

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
        type: DataTypes.ENUM('admin', 'user'),
        allowNull: false,
        defaultValue: 'user'
    },
    profile_picture: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'default-profile.png'
    },
    gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
        validate: {
            isIn: [['male', 'female']]
        }
    },
    email: {
        type: DataTypes.STRING(191), // Reduced length for better indexing
        allowNull: false,
        unique: true, // Emails should generally be unique
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
    verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    token: {
        type: DataTypes.STRING,
        defaultValue: () => uuidv4(),
        allowNull: true
    },
    // New fields for accreditation system
    employee_id: {
        type: DataTypes.STRING,
        allowNull: true
        // unique: true // Removed: Rely on the more specific index definition below
    },
    department: {
        type: DataTypes.STRING,
        allowNull: true
    },
    position: {
        type: DataTypes.STRING,
        allowNull: true
    },
    academic_rank: {
        type: DataTypes.ENUM('professor', 'associate_professor', 'assistant_professor', 'lecturer', 'assistant_lecturer', 'none'),
        allowNull: true,
        defaultValue: 'none'
    },
    expertise: {
        type: DataTypes.STRING,
        allowNull: true
    },
    highest_degree: {
        type: DataTypes.STRING,
        allowNull: true
    },
    institution: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
            const value = this.getDataValue('last_login');
            return value ? moment(value).format('D MMMM, YYYY, h:mm A') : null;
        }
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
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            unique: true,
            fields: ['employee_id'],
            where: {
                employee_id: {
                    [Sequelize.Op.ne]: null
                }
            }
        }
    ],
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
