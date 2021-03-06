const fs = require('fs')

module.exports = {
	async renameFile (oldFilename, newFilename, errorMessage='File system error: Error renaming') {
		return new Promise(async (resolve, reject) => {
			fs.rename(oldFilename, newFilename, err => {
				if (err) { reject({error: err, message: errorMessage}) }
				else { resolve({error: false}) }
			})
		})
	},

	async listDir (pathToDirectory, errorMessage='File system error: Error listing content') {
		return new Promise(async (resolve, reject) => {
			fs.readdir(pathToDirectory, (err, files) => {
				if (err) { reject({error: err, message: errorMessage}) }
				else { resolve(files) }
			})
		})
	},

	async createDirectory (pathToDirectory, errorMessage='File system error: Error creating directory') {
		return new Promise(async (resolve, reject) => {
			fs.mkdir(pathToDirectory, err => {
				if (err) { reject({error: err, message: errorMessage}) }
				else { resolve({error: false}) }
			})
		})
	},

	async readFile (filePath, errorMessage='File system error: Error reading file') {
		return new Promise(async (resolve, reject) => {
			fs.readFile(filePath, (err, fileContent) => {
				if (err) { reject({error: err, message: errorMessage}) }
				else { resolve(fileContent) }
			})
		})
	},

	async writeFile (filePath, fileData, errorMessage='File system error: Error writing file') {
		return new Promise(async (resolve, reject) => {
			fs.writeFile(filePath, fileData, err => {
				if (err) { reject({error: err, message: errorMessage}) }
				else { resolve({error: false}) }
			})
		})
	},
	
	async deleteFile (filePath, errorMessage='File system error: Error deleting file') {
		return new Promise(async (resolve, reject) => {
			fs.unlink(filePath, err => {
				if (err) { reject({error: err, message: errorMessage}) }
				else { resolve({error: false}) }
			})
		})
	}	
}