export default function DashboardPage() {
    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>List of displays</h1>
            <div
                style={{
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '1rem',
                    height: '300px',
                    overflowY: 'auto',
                    marginBottom: '1.5rem',
                    background: '#fafafa'
                }}
            >
                {/* Add your elements here */}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button">Preview</button>
                <button type="button">Edit</button>
            </div>
        </div>
    );
}