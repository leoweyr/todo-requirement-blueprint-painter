import { Component, type ReactNode, type CSSProperties, type ChangeEvent } from 'react';


export interface FileOpenModalProps {
    onFileSelected: (fileContent: string, fileName: string) => void;
}


class FileOpenModal extends Component<FileOpenModalProps> {
    private _fileInput: HTMLInputElement | null = null;

    public render(): ReactNode {
        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>Open Diagram</h2>
                
                <p style={this.getDescriptionStyle()}>
                    Please select a Todo Requirement Blueprint (YAML/JSON) file to open.
                </p>

                <div style={this.getButtonGroupStyle()}>
                    <button 
                        style={this.getButtonStyle()}
                        onClick={this.handleButtonClick}
                    >
                        Open File
                    </button>
                </div>

                <input 
                    type="file" 
                    ref={this.handleInputReference}
                    style={{ display: 'none' }}
                    accept=".yaml,.json"
                    onChange={this.handleFileChange}
                />
            </div>
        );
    }

    private handleInputReference: (reference: HTMLInputElement | null) => void = (reference: HTMLInputElement | null): void => {
        this._fileInput = reference;
    };

    private handleButtonClick: () => void = (): void => {
        if (this._fileInput) {
            this._fileInput.click();
        }
    };

    private handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        const file: File | undefined = event.target.files?.[0];

        if (!file) return;

        const reader: FileReader = new FileReader();

        reader.onload = (readerEvent: ProgressEvent<FileReader>): void => {
            const content: string | ArrayBuffer | null | undefined = readerEvent.target?.result;

            if (typeof content === 'string') {
                this.props.onFileSelected(content, file.name);
            }
        };

        reader.readAsText(file);
        
        // Reset input value so the same file can be selected again if needed.
        event.target.value = '';
    };

    private getContainerStyle(): CSSProperties {
        return {
            backgroundColor: '#ffffff',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '400px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        };
    }

    private getTitleStyle(): CSSProperties {
        return {
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: '#333333'
        };
    }

    private getDescriptionStyle(): CSSProperties {
        return {
            margin: 0,
            fontSize: '14px',
            color: '#666666',
            lineHeight: '1.5'
        };
    }

    private getButtonGroupStyle(): CSSProperties {
        return {
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'center'
        };
    }

    private getButtonStyle(): CSSProperties {
        return {
            padding: '10px 24px',
            backgroundColor: '#007AFF',  // iOS blue-ish.
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            outline: 'none'
        };
    }
}


export default FileOpenModal;
