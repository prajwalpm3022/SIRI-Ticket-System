const OracleDB = require('oracledb');

class DatabaseHandler {
    constructor() {
        try {
            OracleDB.initOracleClient({ libDir: process.env.LIBDIRPATH });
            OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        } catch (err) {
            console.error('Error initializing Oracle client', err);
            throw err;
        }
        this.dbConfig = {
            user: process.env.SIRI_DB_USER,
            password: process.env.SIRI_DB_PASSWORD,
            connectString: process.env.SIRI_DB_CONNECTIONSTRING,
            poolMin: 0, // Allow pool to start empty
            poolMax: 20, // Max connections at a time
            poolIncrement: 1 // Increase connections by 1 as needed
        };


        this.pool = null;
    }


    async initializePool() {
        if (!this.pool) {
            try {
                this.pool = await OracleDB.createPool(this.dbConfig);
            } catch (err) {
                console.error('Error creating connection pool', err);
                throw err;
            }
        }
    }

    // Get a connection from the pool
    async getConnection() {
        try {
            if (!this.pool) await this.initializePool();
            return await this.pool.getConnection();
        } catch (err) {
            console.error('Error getting connection from pool', err);
            throw err;
        }
    }

    // Close the entire pool (call this during application shutdown)
    async closePool() {
        if (this.pool) {
            try {
                await this.pool.close(10); // Wait 10 seconds for connections to close
                console.log('Connection pool closed successfully');
            } catch (err) {
                console.error('Error closing connection pool', err);
            }
        }
    }

    // Execute a query with bind parameters
    async executeQueryWithParams(query, bindParams = {}) {
        let connection;
        let result;
        try {
            connection = await this.getConnection();
            result = await connection.execute(query, bindParams, { autoCommit: true });
        } catch (err) {
            console.error('Error executing query', err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection', err);
                }
            }
        }
        return result;
    }

    // Execute a query without parameters
    async executeQueryWithoutParams(query) {
        return this.executeQueryWithParams(query, {});
    }

    async executeTransaction(operations) {
        let connection;
        try {
            connection = await this.getConnection();

            const results = [];
            for (const operation of operations) {
                const result = await connection.execute(
                    operation.query,
                    operation.params || {},
                    { autoCommit: false }
                );
                results.push(result);
            }

            await connection.commit();
            return results;

        } catch (err) {
            if (connection) await connection.rollback();
            console.error("Transaction failed, rolled back:", err);
            throw err;
        } finally {
            if (connection) await connection.close();
        }
    }

    // Fetch email confirmation record
    async fetchEmailConfirmationRecord(sl_no) {
        const query = `SELECT * FROM email_confirmation WHERE SL_NO = :sl_no`;
        const maxCountQuery = `SELECT COUNT(*) AS count FROM email_confirmation`;
        const bindParams = { sl_no };

        const result = await this.executeQueryWithParams(query, bindParams);
        const countResult = await this.executeQueryWithoutParams(maxCountQuery);

        return {
            maxCount: countResult.rows[0],
            result: result.rows[0],
        };
    }

    // Update email count
    async updateEmailCount(sl_no) {
        const query = `UPDATE email_confirmation SET COUNT = COUNT + 1 WHERE SL_NO = :sl_no`;
        const bindParams = { sl_no };
        await this.executeQueryWithParams(query, bindParams);
    }

    // Reset email count
    async resetEmailCount() {
        const query = `UPDATE email_confirmation SET COUNT = 0`;
        await this.executeQueryWithoutParams(query);
    }

    // Execute many queries with batch processing
    async executeMany(query, binds, options = {}) {
        let connection;
        let result;
        try {
            connection = await this.getConnection();
            const defaultOptions = {
                autoCommit: true,
                batchErrors: true
            };
            const mergedOptions = { ...defaultOptions, ...options };

            result = await connection.executeMany(query, binds, mergedOptions);
        } catch (err) {
            console.error('Error executing batch query', err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection', err);
                }
            }
        }
        return result;
    }
}

module.exports = { DatabaseHandler };
