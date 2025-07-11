# Rate Limiting Configuration Guide

## Overview

The Rate Limiting feature in Mopgomglobal allows administrators to control API request rates and prevent abuse. This comprehensive guide explains how to configure and use rate limiting effectively.

## Accessing Rate Limits

1. **Navigate to Settings**: Go to Admin Panel → Settings
2. **Select Rate Limits Tab**: Click on the "Rate Limits" tab (⚡ icon)
3. **Admin Access Required**: Only Admin and Super Admin roles can configure rate limits

## Rate Limit Categories

### 1. General API Requests
- **Purpose**: Controls overall API usage across the system
- **Default**: 100 requests per minute
- **Recommended Range**: 50-200 requests per minute
- **Use Case**: Prevents general API abuse and ensures system stability

### 2. Registration Submissions
- **Purpose**: Limits new registration submissions to prevent spam
- **Default**: 5 submissions per minute
- **Recommended Range**: 2-10 submissions per minute
- **Use Case**: Prevents automated registration spam and duplicate submissions

### 3. Login Attempts
- **Purpose**: Protects against brute force login attacks
- **Default**: 10 attempts per minute
- **Recommended Range**: 5-20 attempts per minute
- **Use Case**: Security measure against password cracking attempts

### 4. Email/SMS Sending
- **Purpose**: Controls communication volume and costs
- **Default**: 20 messages per hour
- **Recommended Range**: 10-50 messages per hour
- **Use Case**: Manages communication costs and prevents spam

## Configuration Options

### Time Windows
- **Minute**: Short-term burst protection
- **Hour**: Medium-term usage control
- **Day**: Long-term quota management

### Advanced Settings

#### Enable Rate Limiting
- **Toggle**: Turn rate limiting on/off globally
- **Default**: Enabled
- **Note**: Disabling removes all rate limit protections

#### Whitelist Admin IPs
- **Toggle**: Exempt admin IP addresses from rate limits
- **Default**: Enabled
- **Benefit**: Allows admins to work without restrictions

#### Burst Allowance
- **Range**: 100% - 500%
- **Default**: 150%
- **Purpose**: Allow temporary spikes above normal limits
- **Example**: 150% = 50% extra requests during peak times

## Configuration Examples

### 🛡️ Conservative (High Security)
**Best for**: Small events, high-security requirements
- API Requests: 50 per minute
- Registrations: 2 per hour
- Login Attempts: 5 per minute
- Messages: 10 per hour

### ⚖️ Balanced (Recommended)
**Best for**: Most events, good balance of security and usability
- API Requests: 100 per minute
- Registrations: 5 per minute
- Login Attempts: 10 per minute
- Messages: 20 per hour

### 🚀 Permissive (High Volume)
**Best for**: Large events, high registration volume expected
- API Requests: 200 per minute
- Registrations: 10 per minute
- Login Attempts: 20 per minute
- Messages: 50 per hour

## How Rate Limiting Works

### Request Tracking
1. **IP-based**: Limits are tracked per IP address
2. **Time Windows**: Counters reset based on selected time window
3. **Sliding Window**: Uses rolling time periods for accurate limiting

### Response Behavior
- **Within Limits**: Requests processed normally
- **Exceeded Limits**: HTTP 429 "Too Many Requests" response
- **Retry Headers**: Includes retry-after information

### Burst Handling
- **Normal Operation**: Standard limits apply
- **Peak Times**: Burst allowance provides extra capacity
- **Gradual Recovery**: Limits gradually return to normal

## Best Practices

### Setting Appropriate Limits

1. **Monitor Traffic Patterns**
   - Review normal usage before setting limits
   - Account for peak registration periods
   - Consider legitimate user behavior

2. **Start Conservative**
   - Begin with lower limits
   - Gradually increase based on needs
   - Monitor for false positives

3. **Test Thoroughly**
   - Test limits with real usage scenarios
   - Verify legitimate users aren't blocked
   - Ensure emergency access remains available

### Monitoring and Adjustment

1. **Regular Review**
   - Check rate limit effectiveness monthly
   - Adjust based on traffic growth
   - Update for seasonal variations

2. **User Feedback**
   - Monitor user complaints about access issues
   - Adjust limits if legitimate users are affected
   - Provide clear error messages

3. **Security Monitoring**
   - Watch for repeated limit violations
   - Investigate suspicious patterns
   - Consider additional security measures for persistent violators

## Troubleshooting

### Common Issues

#### Users Can't Register
- **Cause**: Registration limits too low
- **Solution**: Increase registration submission limits
- **Check**: Review recent registration volume

#### Login Problems
- **Cause**: Login attempt limits too restrictive
- **Solution**: Increase login attempt limits
- **Check**: Consider password reset frequency

#### API Errors
- **Cause**: General API limits too low
- **Solution**: Increase API request limits
- **Check**: Monitor application API usage patterns

#### Communication Delays
- **Cause**: Email/SMS limits too restrictive
- **Solution**: Increase messaging limits
- **Check**: Review communication volume needs

### Emergency Procedures

#### Temporary Disable
1. Go to Rate Limits settings
2. Toggle "Enable Rate Limiting" to OFF
3. Save settings
4. Re-enable after resolving issues

#### Quick Adjustments
1. Identify problematic limit
2. Temporarily increase by 50-100%
3. Monitor results
4. Fine-tune as needed

## Security Considerations

### Protection Benefits
- **DDoS Mitigation**: Reduces impact of denial-of-service attacks
- **Resource Protection**: Prevents server overload
- **Cost Control**: Manages API and communication costs
- **Fair Usage**: Ensures equal access for all users

### Potential Risks
- **False Positives**: Legitimate users may be blocked
- **User Experience**: Overly strict limits frustrate users
- **Emergency Access**: Critical operations may be hindered

### Balancing Security and Usability
1. **Gradual Implementation**: Start with lenient limits
2. **User Communication**: Inform users about rate limits
3. **Exception Handling**: Provide override mechanisms for emergencies
4. **Regular Review**: Continuously optimize based on usage patterns

## Support and Maintenance

### Regular Tasks
- Monthly limit review and adjustment
- Quarterly security assessment
- Annual configuration optimization

### Documentation
- Keep configuration changes documented
- Maintain rationale for limit choices
- Record any emergency overrides

### Training
- Ensure admin team understands rate limiting
- Provide troubleshooting procedures
- Establish escalation protocols

## Conclusion

Rate limiting is a powerful tool for protecting your Mopgomglobal system while maintaining good user experience. Start with recommended settings, monitor usage patterns, and adjust as needed. Regular review and optimization ensure your rate limits remain effective and appropriate for your specific use case.

## Implementation for Developers

### Using Dynamic Rate Limiting in API Routes

The system provides easy-to-use functions for implementing rate limiting in your API routes:

```typescript
import { withDynamicRateLimit } from '@/lib/rate-limiter'

// For registration endpoints
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withDynamicRateLimit(request, 'registrations')
  if (rateLimitResponse) return rateLimitResponse

  // Your API logic here
  return NextResponse.json({ success: true })
}

// For login endpoints
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withDynamicRateLimit(request, 'loginAttempts')
  if (rateLimitResponse) return rateLimitResponse

  // Your authentication logic here
  return NextResponse.json({ success: true })
}
```

### Available Rate Limit Types

- **`apiRequests`** - General API endpoints
- **`registrations`** - Registration submission endpoints
- **`loginAttempts`** - Authentication endpoints
- **`messaging`** - Email/SMS sending endpoints

### Rate Limit Headers

When rate limits are applied, the following headers are included in responses:

- **`X-RateLimit-Limit`** - Maximum requests allowed
- **`X-RateLimit-Remaining`** - Requests remaining in current window
- **`X-RateLimit-Reset`** - Timestamp when limit resets
- **`Retry-After`** - Seconds to wait before retrying (on 429 responses)

### Configuration Integration

The rate limiting system automatically loads configuration from the settings database every 5 minutes. Changes made in the admin panel take effect within this timeframe without requiring a server restart.

For additional support or questions about rate limiting configuration, consult your system administrator or technical support team.
