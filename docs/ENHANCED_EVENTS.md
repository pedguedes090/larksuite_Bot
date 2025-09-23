# Enhanced Event Handling System

## Overview
The larksuite_Bot now features a comprehensive event handling system that supports multiple Lark event types with configurable settings and advanced management capabilities.

## New Event Types Supported

### 1. Message Events
- **`im.message.receive_v1`** - Handle incoming messages (text, images, files)
- **`im.message.message_read_v1`** - Track message read events (disabled by default)

### 2. Chat Management Events  
- **`im.chat.member.user.added_v1`** - User joined chat with auto-registration and welcome messages
- **`im.chat.member.user.deleted_v1`** - User left chat with logging

### 3. Interactive Events
- **`application.bot.menu_v6`** - Bot menu interactions for easy command access

### 4. Organization Events
- **`contact.user.created_v3`** - New user creation in organization

## New Commands

### For All Users
- **`!menu`** - Create/manage interactive bot menus
- **`!chatinfo`** - View chat information and member statistics

### For Admins Only
- **`!events`** - View event statistics and handler information
- **`!eventsconfig`** - Advanced event configuration (deprecated)
- **`!eventconfig`** - Manage event settings (enable/disable, rate limits, etc.)

## Event Configuration

### Configuration File
Events are configured via `data/event_config.json` with these features:
- Enable/disable individual event types
- Set rate limits per event type
- Configure welcome messages for new users
- Adjust cleanup intervals and memory limits

### Default Settings
- **Message events**: Enabled (1000ms rate limit)
- **Join/Leave events**: Enabled (5000ms rate limit)
- **Read events**: Disabled by default (500ms rate limit)
- **Menu events**: Enabled (2000ms rate limit)
- **Contact events**: Enabled (10000ms rate limit)

### Management Commands
```bash
# View current configuration
!eventconfig show

# Enable/disable events
!eventconfig enable read
!eventconfig disable read

# Set rate limits (in milliseconds)
!eventconfig ratelimit join 10000

# Configure welcome messages
!eventconfig welcome true

# Reset to defaults
!eventconfig reset
```

## Features

### 1. Smart Message Handling
- Supports different message types (text, images, files)
- Automatic user registration on first interaction
- Duplicate message prevention with cleanup

### 2. Welcome System
- Automatic welcome messages for new chat members
- Configurable welcome message content
- Can be enabled/disabled per chat

### 3. Interactive Menus
- Bot menu creation with common commands
- Visual icons for better user experience
- Quick access to frequently used features

### 4. Advanced Monitoring
- Event statistics tracking
- Memory usage monitoring
- Rate limiting per event type
- Automatic cleanup of old data

### 5. Rate Limiting
- Per-event rate limiting to prevent spam
- Per-user rate limiting for fair usage
- Configurable limits for different event types

## Architecture

### EventHandler Class
Central event processing with:
- Configuration-based event filtering
- Statistics tracking
- Rate limiting
- Memory management

### EventConfig Class
Configuration management with:
- JSON-based settings storage
- Default value handling
- Runtime configuration changes
- Validation and error handling

### Enhanced UserManager
Extended user management with:
- Activity tracking
- Bulk operations
- Cleanup functions
- Statistics gathering

## Benefits

1. **Improved User Experience**
   - Interactive menus for easy command access
   - Welcome messages for new users
   - Better chat management

2. **Enhanced Administration**
   - Detailed event monitoring
   - Configurable event handling
   - System health tracking

3. **Better Performance**
   - Smart rate limiting
   - Memory management
   - Efficient event processing

4. **Scalability**
   - Modular event system
   - Configurable resource limits
   - Automatic cleanup processes

## Migration Notes

- All existing commands continue to work unchanged
- No breaking changes to current functionality
- Configuration file is created automatically with sensible defaults
- Message read events are disabled by default to reduce noise

## Future Enhancements

Potential additions:
- Custom event handlers via plugins
- Webhook integration for external systems  
- Advanced analytics and reporting
- Multi-language support for event messages
- Integration with external monitoring systems