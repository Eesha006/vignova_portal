package com.vignova.portal.controller;

import com.vignova.portal.entity.Message;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.MessageRepository;
import com.vignova.portal.repository.UserRepository;
import com.vignova.portal.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;

    @GetMapping
    public ResponseEntity<List<Message>> getMessages(Authentication auth,
                                                     @RequestParam(required = false) Long withUserId) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (withUserId != null) {
            return ResponseEntity.ok(messageRepository.findBetweenUsers(user.getId(), withUserId));
        }
        return ResponseEntity.ok(messageRepository.findConversation(user.getId()));
    }

    @PostMapping
    public ResponseEntity<Message> sendMessage(@RequestBody Map<String, Object> body, Authentication auth) {
        User sender = userRepository.findByEmail(auth.getName()).orElseThrow();
        Long receiverId = Long.parseLong(body.get("receiverId").toString());
        User receiver = userRepository.findById(receiverId).orElseThrow();
        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .content(body.get("content").toString())
                .build();
        return ResponseEntity.ok(messageRepository.save(message));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        long count = messageRepository.countByReceiverIdAndReadFalse(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    // Get all users admin can chat with — clients + team members (as users)
    @GetMapping("/contacts")
    public ResponseEntity<List<User>> getContacts(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName()).orElseThrow();
        if (user.getRole() == User.Role.ADMIN) {
            // Return all non-admin users
            List<User> contacts = userRepository.findAll().stream()
                .filter(u -> u.getRole() != User.Role.ADMIN)
                .toList();
            return ResponseEntity.ok(contacts);
        }
        // Client only sees admin
        List<User> admins = userRepository.findAll().stream()
            .filter(u -> u.getRole() == User.Role.ADMIN)
            .toList();
        return ResponseEntity.ok(admins);
    }
}