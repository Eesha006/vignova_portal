package com.vignova.portal.controller;

import com.vignova.portal.entity.TeamMember;
import com.vignova.portal.entity.TeamTask;
import com.vignova.portal.entity.User;
import com.vignova.portal.repository.TeamMemberRepository;
import com.vignova.portal.repository.TeamTaskRepository;
import com.vignova.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/team/tasks")
@RequiredArgsConstructor
public class TeamTaskController {

    private final TeamTaskRepository teamTaskRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    @GetMapping("/my")
    public ResponseEntity<List<TeamTask>> getMyTasks(Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow();

        TeamMember member = teamMemberRepository.findByEmail(user.getEmail())
                .orElseThrow();

        return ResponseEntity.ok(
                teamTaskRepository.findByAssignedToId(member.getId())
        );
    }
}
