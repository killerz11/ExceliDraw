# Requirements Document

## Introduction

This document defines the requirements for a collaborative whiteboard application inspired by Excalidraw. The system enables users to create, edit, and collaborate on digital whiteboards in real-time with drawing tools, shapes, text, and multi-user collaboration features. The application leverages the existing monorepo architecture with HTTP backend for persistence, WebSocket backend for real-time collaboration, and Next.js frontend for the user interface.

## Glossary

- **Canvas_System**: The frontend drawing surface where users create and manipulate visual elements
- **Drawing_Element**: Any visual object on the canvas (rectangle, circle, line, arrow, text, freehand drawing)
- **Collaboration_Server**: The WebSocket backend that synchronizes canvas state across multiple users
- **Persistence_API**: The HTTP backend that stores and retrieves canvas data from the database
- **User_Session**: An authenticated user connection with associated permissions
- **Canvas_Room**: A shared workspace where multiple users can collaborate on the same canvas
- **Operation**: A user action that modifies canvas state (create, update, delete, move element)
- **Canvas_State**: The complete collection of drawing elements and their properties at a point in time
- **Transform**: Position, rotation, and scale properties of a drawing element

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a user, I want to sign up and sign in to the application, so that I can create and access my canvases securely.

#### Acceptance Criteria

1. THE Persistence_API SHALL authenticate users using JWT tokens with email and password credentials
2. WHEN a user signs up, THE Persistence_API SHALL create a unique user account with hashed password storage
3. WHEN a user signs in with valid credentials, THE Persistence_API SHALL return a JWT token valid for 48 hours
4. THE Collaboration_Server SHALL verify JWT tokens before establishing WebSocket connections
5. WHEN a JWT token expires, THE Canvas_System SHALL redirect users to the sign-in page

### Requirement 2: Canvas Creation and Management

**User Story:** As a user, I want to create and manage multiple canvases, so that I can organize different projects separately.

#### Acceptance Criteria

1. WHEN an authenticated user creates a canvas, THE Persistence_API SHALL generate a unique canvas with a slug identifier
2. THE Persistence_API SHALL store canvas metadata including title, creator, creation timestamp, and last modified timestamp
3. WHEN a user requests their canvas list, THE Persistence_API SHALL return all canvases where the user is creator or collaborator
4. THE Canvas_System SHALL display canvas thumbnails with title and last modified date
5. WHEN a user deletes a canvas they created, THE Persistence_API SHALL remove the canvas and all associated elements

### Requirement 3: Drawing Tools - Basic Shapes

**User Story:** As a user, I want to draw basic shapes like rectangles, circles, and lines, so that I can create diagrams and illustrations.

#### Acceptance Criteria

1. WHEN a user selects the rectangle tool and drags on the canvas, THE Canvas_System SHALL create a rectangle element with width and height based on drag distance
2. WHEN a user selects the circle tool and drags on the canvas, THE Canvas_System SHALL create an ellipse element with proportional dimensions
3. WHEN a user selects the line tool and drags on the canvas, THE Canvas_System SHALL create a line element connecting start and end points
4. WHEN a user selects the arrow tool and drags on the canvas, THE Canvas_System SHALL create an arrow element with directional arrowhead
5. THE Canvas_System SHALL render all shape elements with configurable stroke color, fill color, and stroke width

### Requirement 4: Drawing Tools - Freehand and Text

**User Story:** As a user, I want to draw freehand and add text annotations, so that I can create sketches and label my diagrams.

#### Acceptance Criteria

1. WHEN a user selects the pencil tool and drags on the canvas, THE Canvas_System SHALL capture pointer coordinates and render a smooth path
2. THE Canvas_System SHALL store freehand paths as arrays of coordinate points with timestamps
3. WHEN a user double-clicks on the canvas, THE Canvas_System SHALL create a text element with an editable input field
4. THE Canvas_System SHALL support text formatting including font size, font family, and text color
5. WHEN a user finishes editing text, THE Canvas_System SHALL render the text element with specified formatting

### Requirement 5: Element Selection and Manipulation

**User Story:** As a user, I want to select and modify elements on the canvas, so that I can refine my drawings.

#### Acceptance Criteria

1. WHEN a user clicks on a drawing element, THE Canvas_System SHALL display selection handles around the element
2. WHEN a user drags a selected element, THE Canvas_System SHALL update the element position in real-time
3. WHEN a user drags a corner handle, THE Canvas_System SHALL resize the element while maintaining aspect ratio if shift key is pressed
4. WHEN a user drags a rotation handle, THE Canvas_System SHALL rotate the element around its center point
5. THE Canvas_System SHALL support multi-select by shift-clicking or drag-selecting multiple elements

### Requirement 6: Element Properties and Styling

**User Story:** As a user, I want to customize element appearance, so that I can create visually distinct diagrams.

#### Acceptance Criteria

1. WHEN a user selects an element, THE Canvas_System SHALL display a properties panel with styling options
2. THE Canvas_System SHALL allow users to modify stroke color using a color picker with hex and RGB input
3. THE Canvas_System SHALL allow users to modify fill color with support for transparent fills
4. THE Canvas_System SHALL provide stroke width options ranging from 1 to 10 pixels
5. THE Canvas_System SHALL provide stroke style options including solid, dashed, and dotted patterns

### Requirement 7: Canvas State Persistence

**User Story:** As a user, I want my canvas to be automatically saved, so that I don't lose my work.

#### Acceptance Criteria

1. WHEN a user modifies the canvas, THE Canvas_System SHALL queue the operation for persistence
2. THE Canvas_System SHALL batch canvas operations and send them to the Persistence_API every 5 seconds
3. THE Persistence_API SHALL store canvas elements as JSON with element type, properties, and transform data
4. WHEN a user opens a canvas, THE Persistence_API SHALL return all canvas elements ordered by creation timestamp
5. IF persistence fails, THE Canvas_System SHALL retry up to 3 times with exponential backoff

### Requirement 8: Real-Time Collaboration

**User Story:** As a user, I want to collaborate with others on the same canvas in real-time, so that we can work together synchronously.

#### Acceptance Criteria

1. WHEN a user joins a canvas room, THE Collaboration_Server SHALL broadcast the user presence to all connected users
2. WHEN a user performs an operation, THE Collaboration_Server SHALL broadcast the operation to all users in the canvas room within 100 milliseconds
3. THE Canvas_System SHALL display remote user cursors with username labels and distinct colors
4. THE Canvas_System SHALL apply remote operations to the local canvas state in the order received
5. WHEN a user leaves a canvas room, THE Collaboration_Server SHALL remove the user cursor from other users' views

### Requirement 9: Operational Transformation and Conflict Resolution

**User Story:** As a user, I want my changes to merge correctly with others' changes, so that collaborative editing works smoothly.

#### Acceptance Criteria

1. THE Collaboration_Server SHALL assign a monotonically increasing version number to each canvas operation
2. WHEN concurrent operations modify the same element, THE Collaboration_Server SHALL apply operations in version order
3. THE Canvas_System SHALL maintain a local operation queue and reconcile with server-acknowledged operations
4. IF an operation conflicts with a remote operation, THE Canvas_System SHALL transform the local operation based on the remote operation
5. THE Collaboration_Server SHALL reject operations with version numbers older than the current canvas version

### Requirement 10: Canvas Navigation and Zoom

**User Story:** As a user, I want to pan and zoom the canvas, so that I can work with large diagrams efficiently.

#### Acceptance Criteria

1. WHEN a user scrolls with a mouse wheel, THE Canvas_System SHALL zoom the canvas between 10% and 500% scale
2. WHEN a user drags with the middle mouse button or space bar held, THE Canvas_System SHALL pan the canvas viewport
3. THE Canvas_System SHALL maintain zoom level and pan position in the user session
4. WHEN a user presses the "fit to screen" button, THE Canvas_System SHALL adjust zoom and pan to show all elements
5. THE Canvas_System SHALL render elements with appropriate detail level based on current zoom level

### Requirement 11: Undo and Redo

**User Story:** As a user, I want to undo and redo my actions, so that I can experiment without fear of making mistakes.

#### Acceptance Criteria

1. THE Canvas_System SHALL maintain a history stack of up to 50 user operations
2. WHEN a user presses Ctrl+Z or clicks undo, THE Canvas_System SHALL revert the last operation and update the canvas
3. WHEN a user presses Ctrl+Shift+Z or clicks redo, THE Canvas_System SHALL reapply the last undone operation
4. THE Canvas_System SHALL clear the redo stack when a new operation is performed after an undo
5. THE Canvas_System SHALL exclude navigation operations (pan, zoom) from the undo history

### Requirement 12: Export and Sharing

**User Story:** As a user, I want to export my canvas and share it with others, so that I can use my work outside the application.

#### Acceptance Criteria

1. WHEN a user clicks export, THE Canvas_System SHALL generate a PNG image of the canvas at current zoom level
2. THE Canvas_System SHALL provide export options for PNG, SVG, and JSON formats
3. WHEN a user generates a share link, THE Persistence_API SHALL create a public access token for the canvas
4. THE Canvas_System SHALL allow users to set canvas permissions to view-only or edit access
5. WHEN a user accesses a shared canvas, THE Persistence_API SHALL verify the access token and return canvas data if valid
