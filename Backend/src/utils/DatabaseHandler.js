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
        this.pools = {};
        this.dbConfigs = {
            siri_db: {
                user: process.env.SIRI_DB_USER,
                password: process.env.SIRI_DB_PASSWORD,
                connectString: process.env.SIRI_DB_CONNECTIONSTRING,
                poolMin: 0,
                poolMax: 20,
                poolIncrement: 1
            },
        };
    }

    // Initialize a new pool with an alias
    async initializePool(alias) {
        if (!this.dbConfigs[alias]) {
            throw new Error(`Database alias "${alias}" not found in config`);
        }

        if (!this.pools[alias]) {
            try {
                this.pools[alias] = await OracleDB.createPool(this.dbConfigs[alias]);
            } catch (err) {
                console.error(`❌ Error creating connection pool for ${alias}`, err);
                throw err;
            }
        }
    }

    // Get a connection from the pool using alias
    async getConnection(alias) {
        if (!this.dbConfigs[alias]) {
            throw new Error(`Database alias "${alias}" not found in config`);
        }

        try {
            if (!this.pools[alias]) await this.initializePool(alias);
            return await this.pools[alias].getConnection();
        } catch (err) {
            console.error(`❌ Error getting connection from pool "${alias}"`, err);
            throw err;
        }
    }

    // Close a specific pool using alias
    async closePool(alias) {
        if (this.pools[alias]) {
            try {
                await this.pools[alias].close(10);
                delete this.pools[alias];
            } catch (err) {
                console.error(`❌ Error closing pool "${alias}"`, err);
            }
        }
    }

    // Close all pools during application shutdown
    async closeAllPools() {
        for (const alias in this.pools) {
            await this.closePool(alias);
        }
    }

    // Execute a query with parameters using alias
    async executeQuery(query, bindParams = {}, alias) {
        let connection;
        let result;
        try {
            connection = await this.getConnection(alias);
            result = await connection.execute(query, bindParams, { autoCommit: true });
        } catch (err) {
            console.error(`❌ Error executing query in ${alias}`, err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error(`❌ Error closing connection in ${alias}`, err);
                }
            }
        }
        return result;
    }

    async executeTransaction(operations,alias) {
        let connection;
        try {
            connection = await this.getConnection(alias);

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
}

module.exports = { DatabaseHandler };
