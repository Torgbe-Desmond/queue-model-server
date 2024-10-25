class HandleFileCreationHandler {
    constructor() {
        this.fileObject = {};
    }

    // Method to handle file creation or updating
    handleFileCreation = async (file, File, user_id, uploadFile, session) => {
        const { originalname, mimetype } = file;
        const fileNameWithoutExtension = originalname.split('.').slice(0, -1).join('.');

        const fileExists = await File.find({
            originalname: {
                $regex: `^${fileNameWithoutExtension}`,
                $options: 'i'
            }
        });

        let newFileObject;

        try {
            if (fileExists && fileExists.length > 0) {
                // File already exists; proceed to update
                const splitedOriginalname = fileExists[fileExists.length - 1].originalname.split('.');
                const editedOriginalName = this.generateFileName(splitedOriginalname);

                // Update the existing image and get the new URL
                const url = await this.updateImage(user_id, file, editedOriginalName, uploadFile);

                if (url) {
                    this.fileObject = {
                        originalname: editedOriginalName,
                        mimetype,
                        url,
                        user_id
                    };
                    const updatedFile = await File.create([this.fileObject], { session });
                    newFileObject = this.extractFileObject(updatedFile);
                }
            } else {
                // No existing file; create a new entry
                const url = await uploadFile(user_id, file, originalname);
                if (url) {
                    this.fileObject = {
                        originalname,
                        mimetype,
                        url,
                        user_id,
                    };
                    const newFile = await File.create([this.fileObject], { session });
                    newFileObject = this.extractFileObject(newFile);
                }
            }
        } catch (error) {
            throw error;
        }

        return newFileObject;
    }

    // Method to update an existing image
    updateImage = async (user_id, file, editedOriginalName, uploadFile) => {
        // This assumes you have a delete method in your uploadFile service that can handle existing files
        // You might want to adjust this according to your file management strategy
        const url = await uploadFile.updateImage(user_id, file, editedOriginalName);
        return url;
    }

    // Method to extract the created or updated file object
    extractFileObject = (file) => {
        // Ensure the file object is properly extracted
        return file[0];  // Use the first element since `create` returns an array
    }

    // Method to generate a new file name if similar files already exist
    generateFileName = (splitedOriginalname) => {
        let name, extension, editedOriginalName;

        if (splitedOriginalname && splitedOriginalname.length === 2) {
            let number = 1;
            name = splitedOriginalname[0];
            extension = splitedOriginalname[1];
            editedOriginalName = `${name}.${number}.${extension}`;
        } else if (splitedOriginalname && splitedOriginalname.length > 2) {
            name = splitedOriginalname[0];
            let currentNumberOfFilesWithSimilarName = splitedOriginalname[1];
            let updatedNumber = parseInt(currentNumberOfFilesWithSimilarName) + 1;
            extension = splitedOriginalname[2];
            editedOriginalName = `${name}.${updatedNumber}.${extension}`;
        }

        return editedOriginalName;
    }
}

module.exports = HandleFileCreationHandler;
