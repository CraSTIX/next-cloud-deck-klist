const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
	entry: {
		'decklist24-card': path.resolve(__dirname, 'src', 'card-main.js'),
	},
	output: {
		path: path.resolve(__dirname, 'js'),
		filename: '[name].js',
		publicPath: '',
	},
	resolve: {
		extensions: ['.js', '.vue'],
		alias: {
			vue$: 'vue/dist/vue.runtime.esm.js',
		},
	},
	module: {
		rules: [
			{
				test: /\.vue$/,
				loader: 'vue-loader',
			},
			{
				test: /\.css$/,
				use: ['vue-style-loader', 'css-loader'],
			},
		],
	},
	plugins: [
		new VueLoaderPlugin(),
	],
	optimization: {
		runtimeChunk: false,
		splitChunks: false,
	},
	devtool: false,
}
