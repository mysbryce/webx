export default function getFileContent(filePath) {
    return new Promise((resolve, reject) => {
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load file: ${response.statusText}`)
                }
                return response.text()
            })
            .then(content => resolve(content))
            .catch(error => reject(error))
    })
}