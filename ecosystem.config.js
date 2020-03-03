module.exports = {
  apps : [
      {
        name: "tw",
        script: "./index.js",
        instances: 4,
        exec_mode: "cluster",
	instance_var: 'INSTANCE_ID',
	env: {
	"NODE_ENV": "cluster",
	"PORT": 5555
	}
      }
  ]
}
