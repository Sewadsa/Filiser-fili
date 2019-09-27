module.exports = {
  apps : [{
    name   : "fili",
    script : "./libs/start.js",
    error_file : "./data/logs/err.log",
    out_file : "./data/logs/out.log",
    log_date_format : "YYYY-MM-DD HH:mm:ss",
    kill_timeout: 60000,
  }]
}
