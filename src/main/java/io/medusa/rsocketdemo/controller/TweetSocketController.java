package io.medusa.rsocketdemo.controller;

import io.medusa.rsocketdemo.model.Tweet;
import io.medusa.rsocketdemo.model.TweetRequest;
import io.medusa.rsocketdemo.service.TweetService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;

@Controller
public class TweetSocketController {

    private final TweetService service;

    public TweetSocketController(TweetService service) {
        this.service = service;
    }

    @MessageMapping("tweets.by.author")
    public Flux<Tweet> getByAuthor(final Flux<TweetRequest> request) {
        return request.map(r -> service.getByAuthor(r.getAuthor()));
    }

}